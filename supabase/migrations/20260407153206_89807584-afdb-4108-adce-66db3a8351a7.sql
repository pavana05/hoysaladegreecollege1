-- Delete all records for student U03EF23S0007 (student_id: 8d3acfdf-a804-4228-98de-b94c94f9daed, user_id: 0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f)

-- Records referencing students.id
DELETE FROM public.fee_concessions WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.fee_payments WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.semester_fees WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.attendance WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.marks WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.absent_notes WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.student_documents WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.student_badges WHERE student_id = '8d3acfdf-a804-4228-98de-b94c94f9daed';
DELETE FROM public.students WHERE id = '8d3acfdf-a804-4228-98de-b94c94f9daed';

-- Records referencing user_id
DELETE FROM public.notifications WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.feedback_complaints WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.push_subscriptions WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.fcm_tokens WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.direct_messages WHERE sender_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f' OR receiver_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.passkeys WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.activity_logs WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.study_streaks WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.user_roles WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';
DELETE FROM public.profiles WHERE user_id = '0dc5b4fe-1f2c-48a1-8016-c80f22a7c29f';