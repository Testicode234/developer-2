import { WebSocketServer } from 'ws';
import { supabase } from '../config/supabase.js';

const clients = new Map();

export const handleWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      ws.close();
      return;
    }

    clients.set(userId, ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Store message in database
        const { error } = await supabase
          .from('messages')
          .insert([{
            sender_id: userId,
            receiver_id: data.receiverId,
            content: data.content
          }]);

        if (error) throw error;

        // Send to receiver if online
        const receiverWs = clients.get(data.receiverId);
        if (receiverWs && receiverWs.readyState === WebSocketServer.OPEN) {
          receiverWs.send(JSON.stringify({
            type: 'message',
            data: {
              senderId: userId,
              content: data.content,
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(userId);
    });
  });
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: conversations, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender:sender_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group messages by conversation partner
    const groupedConversations = conversations.reduce((acc, message) => {
      const partner = message.sender.id === userId ? message.receiver : message.sender;
      const partnerId = partner.id;

      if (!acc[partnerId]) {
        acc[partnerId] = {
          partner,
          messages: []
        };
      }

      acc[partnerId].messages.push(message);
      return acc;
    }, {});

    res.json(Object.values(groupedConversations));
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender:sender_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(400).json({ error: error.message });
  }
};