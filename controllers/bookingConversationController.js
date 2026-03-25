const BookingSession = require('../models/bookingSession');

// POST /api/booking/conversation
exports.processMessage = async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let session;

    // Initialize or retrieve session
    if (!sessionId) {
      session = await BookingSession.create({
        userId: userId || null,
        currentStep: 'purpose',
        isComplete: false,
      });

      const question = getQuestion('purpose');
      return res.json({
        success: true,
        sessionId: session._id,
        text: question.text,
        quickReplies: question.quickReplies,
        isComplete: false,
      });
    }

    // Retrieve existing session
    session = await BookingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      return res.status(410).json({ success: false, message: 'Session expired' });
    }

    // Parse user response
    const parseResult = parseResponse(session, message);

    if (parseResult.updated) {
      // Move to next step
      session.currentStep = getNextStep(session.currentStep);

      // Check if complete
      if (isContextComplete(session.context)) {
        session.isComplete = true;
        session.currentStep = 'complete';
        await session.save();

        return res.json({
          success: true,
          sessionId: session._id,
          text: '✅ Đang tìm bàn phù hợp cho bạn...',
          isComplete: true,
          context: session.context,
        });
      }

      await session.save();

      // Ask next question
      const question = getQuestion(session.currentStep);
      return res.json({
        success: true,
        sessionId: session._id,
        text: question.text,
        quickReplies: question.quickReplies,
        isComplete: false,
      });
    }

    // If parsing failed, ask again
    return res.json({
      success: true,
      sessionId: session._id,
      text: 'Xin lỗi, tôi không hiểu. Bạn có thể nói rõ hơn không?',
      isComplete: false,
    });
  } catch (err) {
    console.error('[processMessage]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Helper: Parse user response based on current step
function parseResponse(session, message) {
  const msg = message.toLowerCase().trim();
  const step = session.currentStep;

  switch (step) {
    case 'purpose':
      if (msg.includes('hẹn hò') || msg.includes('date')) {
        session.context.purpose = 'date';
        return { updated: true, value: 'date' };
      }
      if (msg.includes('gia đình') || msg.includes('family')) {
        session.context.purpose = 'family';
        return { updated: true, value: 'family' };
      }
      if (msg.includes('công việc') || msg.includes('business')) {
        session.context.purpose = 'business';
        return { updated: true, value: 'business' };
      }
      if (msg.includes('kỷ niệm') || msg.includes('celebration')) {
        session.context.purpose = 'celebration';
        return { updated: true, value: 'celebration' };
      }
      session.context.purpose = 'casual';
      return { updated: true, value: 'casual' };

    case 'date':
      session.context.date = message;
      return { updated: true, value: message };

    case 'time':
      session.context.time = message;
      return { updated: true, value: message };

    case 'partySize':
      const num = parseInt(msg.match(/\d+/)?.[0] || '0');
      if (num > 0) {
        session.context.partySize = num;
        return { updated: true, value: num };
      }
      return { updated: false };

    case 'location':
      session.context.location = message;
      return { updated: true, value: message };

    case 'budget':
      if (msg.includes('bỏ qua') || msg.includes('skip')) {
        return { updated: true, value: 'skip' };
      }
      session.context.budget = message;
      return { updated: true, value: message };

    case 'tableType':
      if (msg.includes('vip')) {
        session.context.tableType = 'vip';
        return { updated: true, value: 'vip' };
      }
      if (msg.includes('view') || msg.includes('cửa sổ')) {
        session.context.tableType = 'view';
        return { updated: true, value: 'view' };
      }
      session.context.tableType = 'regular';
      return { updated: true, value: 'regular' };

    default:
      return { updated: false };
  }
}

// Helper: Get next step
function getNextStep(currentStep) {
  const flow = ['purpose', 'date', 'time', 'partySize', 'location', 'budget', 'tableType', 'complete'];
  const currentIndex = flow.indexOf(currentStep);
  return flow[currentIndex + 1] || 'complete';
}

// Helper: Check if context is complete
function isContextComplete(context) {
  return !!(
    context.purpose &&
    context.date &&
    context.time &&
    context.partySize &&
    context.location &&
    context.tableType
  );
}

// Helper: Get question for step
function getQuestion(step) {
  switch (step) {
    case 'purpose':
      return {
        text: '🍽️ Bạn muốn đi ăn với mục đích gì?',
        quickReplies: [
          { id: '1', text: '❤️ Hẹn hò', value: 'date' },
          { id: '2', text: '👨‍👩‍👧‍👦 Gia đình', value: 'family' },
          { id: '3', text: '💼 Công việc', value: 'business' },
          { id: '4', text: '🎉 Kỷ niệm', value: 'celebration' },
        ],
      };

    case 'date':
      return {
        text: '📅 Bạn muốn đặt bàn ngày nào?',
        quickReplies: [
          { id: '1', text: 'Hôm nay', value: 'today' },
          { id: '2', text: 'Ngày mai', value: 'tomorrow' },
          { id: '3', text: 'Thứ 7 tuần này', value: 'this_saturday' },
        ],
      };

    case 'time':
      return {
        text: '🕐 Mấy giờ?',
        quickReplies: [
          { id: '1', text: '12:00 (Trưa)', value: '12:00' },
          { id: '2', text: '18:00 (Chiều)', value: '18:00' },
          { id: '3', text: '19:00 (Tối)', value: '19:00' },
          { id: '4', text: '20:00 (Tối)', value: '20:00' },
        ],
      };

    case 'partySize':
      return {
        text: '👥 Bao nhiêu người?',
        quickReplies: [
          { id: '1', text: '2 người', value: 2 },
          { id: '2', text: '4 người', value: 4 },
          { id: '3', text: '6 người', value: 6 },
        ],
      };

    case 'location':
      return {
        text: '📍 Khu vực nào?',
        quickReplies: [
          { id: '1', text: 'Quận 1', value: 'Quận 1' },
          { id: '2', text: 'Quận 3', value: 'Quận 3' },
          { id: '3', text: 'Quận 7', value: 'Quận 7' },
          { id: '4', text: 'Gần tôi', value: 'near_me' },
        ],
      };

    case 'budget':
      return {
        text: '💰 Ngân sách của bạn? (Tùy chọn - có thể bỏ qua)',
        quickReplies: [
          { id: '1', text: '< 500k', value: 'budget' },
          { id: '2', text: '500k - 1tr', value: 'medium' },
          { id: '3', text: '> 1tr', value: 'premium' },
          { id: '4', text: 'Bỏ qua', value: 'skip' },
        ],
      };

    case 'tableType':
      return {
        text: '🪑 Loại bàn bạn muốn?',
        quickReplies: [
          { id: '1', text: '✨ VIP', value: 'vip' },
          { id: '2', text: '🌆 View đẹp', value: 'view' },
          { id: '3', text: '🍽️ Bàn thường', value: 'regular' },
        ],
      };

    default:
      return { text: 'Đang tìm nhà hàng phù hợp...' };
  }
}

// GET /api/booking/session/:sessionId
exports.getSession = async (req, res) => {
  try {
    const session = await BookingSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    return res.json({ success: true, session });
  } catch (err) {
    console.error('[getSession]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
