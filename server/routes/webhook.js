const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');

// 驗證 webhook 簽名的函數
function verifyWebhookSignature(body, timestamp, signature, secret) {
    const message = Buffer.concat([
        Buffer.from(JSON.stringify(body)),
        Buffer.from(timestamp)
    ]);
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );
}

// 處理 webhook 事件的函數
function handleWebhookEvents(events, wss) {
    events.forEach(event => {
        const dataToSend = {
            type: event.event,
            data: event.data
        };

        console.log(`🔔 Webhook 收到事件：${event.event}`, dataToSend);

        // 推送給所有前端使用者
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(JSON.stringify(dataToSend));
            }
        });
    });
}

// 將 USDC 最小單位轉換為 USD 金額
function convertUsdcToUsd(usdcAmount) {
  // 1 最小單位 = 0.000001 USD
  return usdcAmount * 0.000001;
}

// 查詢事件的函數
async function queryEvents(eventQuery, offset = 0, limit = 10) {
    try {
      let hostname = process.env.MULTIBAAS_API_URL;
      const apiKey = process.env.MULTIBAAS_API_KEY;
      if (!hostname || !apiKey) {
        throw new Error('Missing MultiBaas hostname or API key in environment variables');
      }
      hostname = hostname.replace(/^https?:\/\//, '');
      const query = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString()
      }).toString();
      const url = `https://${hostname}/api/v0/queries/${eventQuery}/results?${query}`;
      console.log('Querying MultiBaas API:', url);
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 5000
      });
      console.log('MultiBaas API 回應:', response.data); // 檢查回應
      return response.data;
    } catch (error) {
      console.error('Error in queryEvents:', error);
      throw new Error(`Failed to query events: ${error.message}`);
    }
  }

// MultiBaas Webhook 端點
router.post("/multibaas", (req, res) => {
    const signature = req.headers['x-multibaas-signature'];
    const timestamp = req.headers['x-multibaas-timestamp'];
    const secret = process.env.MULTIBAAS_WEBHOOK_SECRET;
    const wss = req.app.get('wss'); // 取得 WebSocket server 實例

    if (!signature || !timestamp || !secret) {
        return res.status(401).json({ error: "Missing required headers or secret" });
    }

    const isValid = verifyWebhookSignature(req.body, timestamp, signature, secret);
    if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
    }

    try {
        const events = req.body;
        handleWebhookEvents(events, wss); // 傳入 WebSocket server
        res.status(200).json({ message: "Webhook received successfully" });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: "Error processing webhook" });
    }
});

// 查詢事件的端點
router.get("/events/:eventQuery", async (req, res) => {
    try {
      const { eventQuery } = req.params;
      const { offset = 0, limit = 10, userAddress } = req.query;
      
      console.log('查詢參數:', { eventQuery, offset, limit, userAddress });
      
      // 獲取所有事件
      const result = await queryEvents(eventQuery, offset, limit);
      
      // 過濾事件，只返回與用戶地址相關的事件
      let rows = result.result.rows;
      
      // 如果提供了用戶地址，則過濾結果只顯示該用戶的交易
      if (userAddress) {
        const normalizedUserAddress = userAddress.toLowerCase();
        rows = rows.filter(row => {
          // 檢查sender是否匹配用戶地址
          const sender = (row.sender || '').toLowerCase();
          // 也檢查recipient或其他可能包含用戶地址的字段
          const recipient = (row.recipient || '').toLowerCase();
          
          return sender === normalizedUserAddress || recipient === normalizedUserAddress;
        });
        
        console.log(`已過濾，找到用戶 ${userAddress} 的 ${rows.length} 筆交易`);
      }
      
      // 轉換USDC金額
      const processedRows = rows.map(row => {
        if (row.assets) {
          const usdAmount = convertUsdcToUsd(row.assets);
          console.log(`轉換 USDC: ${row.assets} -> ${usdAmount} USD`);
          return {
            ...row,
            assets: usdAmount
          };
        }
        return row;
      });
      
      console.log('API 返回資料:', processedRows);
      res.status(200).json(processedRows);
    } catch (error) {
      console.error("❌ 發生錯誤：", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      res.status(500).json({ error: "Failed to query events", details: error.message });
    }
  });


module.exports = router;