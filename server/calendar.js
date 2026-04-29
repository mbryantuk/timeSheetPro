const ical = require('node-ical');
require('dotenv').config();

const ICAL_URL = process.env.ICAL_URL || '';

async function getMeetingsForTimeframe(start, end) {
  if (!ICAL_URL) return [];
  try {
    const events = await ical.async.fromURL(ICAL_URL);
    const meetings = [];
    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const event = events[k];
        if (event.type === 'VEVENT') {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          
          // If event overlaps with the timeframe
          if (eventStart < end && eventEnd > start) {
            meetings.push(`- ${event.summary} (${eventStart.toLocaleTimeString()} - ${eventEnd.toLocaleTimeString()})`);
          }
        }
      }
    }
    return meetings;
  } catch (error) {
    console.error('Failed to parse calendar:', error.message);
    return [];
  }
}

module.exports = { getMeetingsForTimeframe };
