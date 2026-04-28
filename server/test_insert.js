const { db, initDb } = require('./db');

async function test() {
  await initDb();
  console.log("DB init done");
  try {
    const res = await db('activities').insert({
      process_name: "test",
      window_title: "test",
      url: "test",
      ocr_text: "test",
      image_data: "test",
      duration_ms: 5000,
      task_id: null
    });
    console.log("Insert result:", res);
  } catch (e) {
    console.error("Insert error:", e);
  }
  process.exit(0);
}
test();
