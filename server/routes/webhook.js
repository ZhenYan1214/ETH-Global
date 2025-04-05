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


// 查詢事件的函數
async function queryEvents(eventQuery, offset = 0, limit = 10) {
    try {
        const hostname = process.env.MULTIBAAS_API_URL;
        const apiKey = process.env.MULTIBAAS_API_KEY;

        if (!hostname || !apiKey) {
            throw new Error('Missing MultiBaas hostname or API key in environment variables');
        }

        const query = new URLSearchParams({
            offset: offset.toString(),
            limit: limit.toString()
        }).toString();

        const url = `https://${hostname}/api/v0/queries/${eventQuery}/results?${query}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        return response.data;
    } catch (error) {
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
        const { offset = 0, limit = 10 } = req.query;
        const result = await queryEvents(eventQuery, offset, limit);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to query events", details: error.message });
    }
});

module.exports = router;