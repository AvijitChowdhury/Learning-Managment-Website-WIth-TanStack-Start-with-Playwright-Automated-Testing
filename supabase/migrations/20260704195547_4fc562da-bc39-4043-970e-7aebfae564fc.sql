
DO $$
DECLARE
  cid uuid := 'a45ac834-fded-48bc-875b-60b538bacb00';
  m_id uuid;
BEGIN
  DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = cid);
  DELETE FROM modules WHERE course_id = cid;

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'শুরু করার আগে', 0) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'কোর্স পরিচিতি ও রোডম্যাপ', 'VIDEO', 480, 0, true),
    (m_id, 'ডেভেলপার টুলস সেটআপ (VS Code, Chrome)', 'VIDEO', 600, 1, true),
    (m_id, 'ইন্টারনেট কীভাবে কাজ করে', 'VIDEO', 540, 2, false),
    (m_id, 'ওয়েবসাইট, ওয়েব অ্যাপ ও ব্রাউজার', 'VIDEO', 420, 3, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'HTML মৌলিক', 1) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'HTML স্ট্রাকচার ও ট্যাগ', 'VIDEO', 720, 0, false),
    (m_id, 'টেক্সট, লিংক ও ইমেজ', 'VIDEO', 660, 1, false),
    (m_id, 'লিস্ট, টেবিল ও ফর্ম', 'VIDEO', 900, 2, false),
    (m_id, 'সেমান্টিক HTML ও অ্যাক্সেসিবিলিটি', 'VIDEO', 780, 3, false),
    (m_id, 'প্র্যাকটিস: পোর্টফোলিও পেজ', 'VIDEO', 1200, 4, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'CSS ও লেআউট', 2) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'সিলেক্টর ও কালার সিস্টেম', 'VIDEO', 720, 0, false),
    (m_id, 'বক্স মডেল ও স্পেসিং', 'VIDEO', 660, 1, false),
    (m_id, 'Flexbox দিয়ে লেআউট', 'VIDEO', 900, 2, false),
    (m_id, 'CSS Grid দিয়ে লেআউট', 'VIDEO', 960, 3, false),
    (m_id, 'রেসপনসিভ ডিজাইন ও মিডিয়া কুয়েরি', 'VIDEO', 840, 4, false),
    (m_id, 'অ্যানিমেশন ও ট্রানজিশন', 'VIDEO', 720, 5, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'JavaScript মৌলিক', 3) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'ভ্যারিয়েবল, ডেটা টাইপ ও অপারেটর', 'VIDEO', 780, 0, false),
    (m_id, 'কন্ডিশন, লুপ ও ফাংশন', 'VIDEO', 900, 1, false),
    (m_id, 'অ্যারে ও অবজেক্ট', 'VIDEO', 840, 2, false),
    (m_id, 'DOM ম্যানিপুলেশন', 'VIDEO', 960, 3, false),
    (m_id, 'ইভেন্ট হ্যান্ডলিং', 'VIDEO', 720, 4, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'JavaScript অ্যাডভান্সড', 4) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'ES6+ ফিচার (let, const, arrow)', 'VIDEO', 720, 0, false),
    (m_id, 'অ্যাসিনক্রোনাস JS: Promise ও async/await', 'VIDEO', 1080, 1, false),
    (m_id, 'Fetch API ও REST কল', 'VIDEO', 840, 2, false),
    (m_id, 'মডিউল ও বান্ডলিং বেসিক', 'VIDEO', 660, 3, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'ফাইনাল প্রজেক্ট: টাস্ক ম্যানেজার', 5) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'প্রজেক্ট প্ল্যানিং ও UI ডিজাইন', 'VIDEO', 720, 0, false),
    (m_id, 'HTML ও CSS স্ট্রাকচার', 'VIDEO', 900, 1, false),
    (m_id, 'CRUD ফিচার তৈরি', 'VIDEO', 1200, 2, false),
    (m_id, 'localStorage-এ ডেটা সেভ', 'VIDEO', 780, 3, false),
    (m_id, 'ডিপ্লয় (Netlify / Vercel)', 'VIDEO', 600, 4, false);

  INSERT INTO modules (id, course_id, title, "order") VALUES (gen_random_uuid(), cid, 'পরবর্তী ধাপ ও ক্যারিয়ার', 6) RETURNING id INTO m_id;
  INSERT INTO lessons (module_id, title, type, duration_sec, "order", is_free_preview) VALUES
    (m_id, 'Git ও GitHub পরিচিতি', 'VIDEO', 720, 0, false),
    (m_id, 'React শেখার রোডম্যাপ', 'VIDEO', 540, 1, false),
    (m_id, 'পোর্টফোলিও ও রিজিউমে টিপস', 'VIDEO', 600, 2, false),
    (m_id, 'ফ্রিল্যান্সিং ও প্রথম ক্লায়েন্ট', 'VIDEO', 660, 3, false);
END $$;
