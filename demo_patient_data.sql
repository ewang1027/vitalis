-- Demo Patient Data SQL Script
-- This script creates realistic patient data for demonstration purposes

-- Clear existing demo data (optional - comment out if you want to keep existing data)
-- DELETE FROM vitals;
-- DELETE FROM room_assignments WHERE is_active = true;
-- DELETE FROM patients WHERE is_active = true;

-- Insert Staff Members (Doctors and Nurses)
INSERT INTO staff (id, name, role, department, is_online, email, phone) VALUES
  ('doc-001', 'Dr. Sarah Chen', 'Doctor', 'Emergency', true, 'sarah.chen@hospital.com', '555-0101'),
  ('doc-002', 'Dr. Michael Rodriguez', 'Doctor', 'Cardiology', true, 'michael.rodriguez@hospital.com', '555-0102'),
  ('doc-003', 'Dr. Emily Watson', 'Doctor', 'Neurology', true, 'emily.watson@hospital.com', '555-0103'),
  ('doc-004', 'Dr. James Kim', 'Doctor', 'Pediatrics', true, 'james.kim@hospital.com', '555-0104'),
  ('nurse-001', 'Maria Santos', 'Nurse', 'Emergency', true, 'maria.santos@hospital.com', '555-0201'),
  ('nurse-002', 'David Thompson', 'Nurse', 'Cardiology', true, 'david.thompson@hospital.com', '555-0202'),
  ('nurse-003', 'Lisa Anderson', 'Nurse', 'Neurology', true, 'lisa.anderson@hospital.com', '555-0203'),
  ('nurse-004', 'Robert Lee', 'Nurse', 'Pediatrics', true, 'robert.lee@hospital.com', '555-0204')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_online = EXCLUDED.is_online;

-- Insert Realistic Patients
INSERT INTO patients (id, name, age, gender, admission_date, condition, severity, is_active) VALUES
  ('pat-001', 'John Anderson', 67, 'Male', '2024-11-14 08:30:00', 'Acute Myocardial Infarction', 'critical', true),
  ('pat-002', 'Maria Garcia', 45, 'Female', '2024-11-15 10:15:00', 'Pneumonia', 'moderate', true),
  ('pat-003', 'Robert Johnson', 72, 'Male', '2024-11-13 14:20:00', 'Stroke Recovery', 'moderate', true),
  ('pat-004', 'Jennifer Lee', 34, 'Female', '2024-11-16 09:00:00', 'Post-Surgical Care', 'stable', true),
  ('pat-005', 'William Davis', 81, 'Male', '2024-11-12 16:45:00', 'Congestive Heart Failure', 'critical', true),
  ('pat-006', 'Sarah Miller', 58, 'Female', '2024-11-15 13:30:00', 'Diabetes Management', 'stable', true),
  ('pat-007', 'Michael Brown', 49, 'Male', '2024-11-14 11:00:00', 'COVID-19 Pneumonia', 'moderate', true),
  ('pat-008', 'Emily Wilson', 28, 'Female', '2024-11-16 07:30:00', 'Asthma Exacerbation', 'stable', true),
  ('pat-009', 'Thomas Martinez', 63, 'Male', '2024-11-13 19:15:00', 'Sepsis', 'critical', true),
  ('pat-010', 'Patricia Taylor', 55, 'Female', '2024-11-15 08:45:00', 'Kidney Infection', 'moderate', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  gender = EXCLUDED.gender,
  condition = EXCLUDED.condition,
  severity = EXCLUDED.severity,
  is_active = EXCLUDED.is_active;

-- Create Rooms if they don't exist
INSERT INTO rooms (id, room_number, floor, room_type, status, capacity) VALUES
  ('room-101', '101', 1, 'ICU', 'occupied', 1),
  ('room-102', '102', 1, 'ICU', 'occupied', 1),
  ('room-103', '103', 1, 'ICU', 'occupied', 1),
  ('room-201', '201', 2, 'General', 'occupied', 2),
  ('room-202', '202', 2, 'General', 'occupied', 2),
  ('room-203', '203', 2, 'General', 'occupied', 1),
  ('room-204', '204', 2, 'General', 'occupied', 2),
  ('room-205', '205', 2, 'General', 'occupied', 1),
  ('room-301', '301', 3, 'Private', 'occupied', 1),
  ('room-302', '302', 3, 'Private', 'occupied', 1),
  ('room-303', '303', 3, 'Private', 'available', 1),
  ('room-304', '304', 3, 'Private', 'available', 1)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- Assign Patients to Rooms
INSERT INTO room_assignments (id, room_id, patient_id, assigned_doctor_id, assigned_nurse_id, assigned_at, is_active) VALUES
  ('assign-001', 'room-101', 'pat-001', 'doc-002', 'nurse-002', '2024-11-14 08:30:00', true),
  ('assign-002', 'room-102', 'pat-005', 'doc-002', 'nurse-002', '2024-11-12 16:45:00', true),
  ('assign-003', 'room-103', 'pat-009', 'doc-001', 'nurse-001', '2024-11-13 19:15:00', true),
  ('assign-004', 'room-201', 'pat-002', 'doc-001', 'nurse-001', '2024-11-15 10:15:00', true),
  ('assign-005', 'room-202', 'pat-003', 'doc-003', 'nurse-003', '2024-11-13 14:20:00', true),
  ('assign-006', 'room-203', 'pat-007', 'doc-001', 'nurse-001', '2024-11-14 11:00:00', true),
  ('assign-007', 'room-204', 'pat-010', 'doc-001', 'nurse-001', '2024-11-15 08:45:00', true),
  ('assign-008', 'room-205', 'pat-006', 'doc-002', 'nurse-002', '2024-11-15 13:30:00', true),
  ('assign-009', 'room-301', 'pat-004', 'doc-001', 'nurse-001', '2024-11-16 09:00:00', true),
  ('assign-010', 'room-302', 'pat-008', 'doc-004', 'nurse-004', '2024-11-16 07:30:00', true)
ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- Insert Initial Vital Signs for Each Patient
-- Critical Patient 1: John Anderson (Heart Attack - abnormal vitals)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-001', 112, '160/95', 98.9, 91, NOW() - INTERVAL '5 minutes');

-- Moderate Patient 2: Maria Garcia (Pneumonia - slightly elevated)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-002', 88, '128/82', 100.4, 94, NOW() - INTERVAL '3 minutes');

-- Moderate Patient 3: Robert Johnson (Stroke Recovery - stable but monitored)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-003', 76, '145/88', 98.3, 96, NOW() - INTERVAL '4 minutes');

-- Stable Patient 4: Jennifer Lee (Post-Surgery - normal vitals)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-004', 72, '118/76', 98.6, 98, NOW() - INTERVAL '2 minutes');

-- Critical Patient 5: William Davis (Heart Failure - concerning vitals)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-005', 105, '142/90', 99.1, 89, NOW() - INTERVAL '6 minutes');

-- Stable Patient 6: Sarah Miller (Diabetes - controlled)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-006', 68, '122/78', 98.4, 97, NOW() - INTERVAL '7 minutes');

-- Moderate Patient 7: Michael Brown (COVID Pneumonia - elevated)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-007', 92, '135/85', 101.2, 93, NOW() - INTERVAL '3 minutes');

-- Stable Patient 8: Emily Wilson (Asthma - improving)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-008', 74, '115/72', 98.2, 96, NOW() - INTERVAL '8 minutes');

-- Critical Patient 9: Thomas Martinez (Sepsis - very concerning)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-009', 118, '88/52', 102.8, 88, NOW() - INTERVAL '2 minutes');

-- Moderate Patient 10: Patricia Taylor (Kidney Infection - elevated temp)
INSERT INTO vitals (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation, recorded_at) VALUES
  ('pat-010', 84, '132/84', 100.8, 95, NOW() - INTERVAL '5 minutes');

-- Add some equipment to rooms
INSERT INTO equipment (id, name, type, status, current_room_id, last_maintenance, next_maintenance) VALUES
  ('eq-001', 'Cardiac Monitor A1', 'monitor', 'in_use', 'room-101', '2024-11-01', '2024-12-01'),
  ('eq-002', 'Ventilator V3', 'ventilator', 'in_use', 'room-101', '2024-11-05', '2024-12-05'),
  ('eq-003', 'IV Pump IP4', 'iv_pump', 'in_use', 'room-102', '2024-11-03', '2024-12-03'),
  ('eq-004', 'Cardiac Monitor B2', 'monitor', 'in_use', 'room-102', '2024-11-01', '2024-12-01'),
  ('eq-005', 'Oxygen Tank O5', 'oxygen', 'in_use', 'room-103', '2024-11-10', '2024-12-10'),
  ('eq-006', 'Cardiac Monitor C3', 'monitor', 'in_use', 'room-103', '2024-11-02', '2024-12-02')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  current_room_id = EXCLUDED.current_room_id;

-- Success message
SELECT 'Demo patient data loaded successfully!' as message,
       (SELECT COUNT(*) FROM patients WHERE is_active = true) as active_patients,
       (SELECT COUNT(*) FROM rooms) as total_rooms,
       (SELECT COUNT(*) FROM staff) as staff_members;

