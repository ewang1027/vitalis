# Vitalis

Vitalis is a HackNYU project focused on improving patient wellness and monitoring by combining intuitive UI design, smart analytics, and seamless data tracking. Our vision is to create a personalized, adaptive system that gives users meaningful insights rather than just raw data.

- Inspiration  
Healthcare often suffers from scattered data, low accessibility, and poor personalization. Patients and caregivers need real-time, actionable insights — not fragmented dashboards. We wanted to build something simple, elegant, and useful that could evolve into a real healthcare assistant system. Vitalis was born from that motivation.


- What It Does  

Vitalis provides:
- **Real-time vitals monitoring** using ESP32 sensor inputs  
- **Live dashboards** that show patient health status at a glance  
- **Alerts and insights** based on sensor data  
- **A clean UI** designed for simplicity and quick decision-making  
- **Scalable architecture** to support single-patient or entire-ward setups  

The platform is designed to eventually act as an on-device patient assistant, capable of interacting directly with patients and medical staff.



 How We Built It  
 
- **Hardware:** ESP32-based sensors sending vitals data  
- **Backend:** Node.js + Express server for storing and serving health metrics  
- **Frontend:** React-based UI for live dashboards and patient views  
- **Database:** MongoDB (as needed)
- **APIs:** Custom endpoints to receive sensor data from ESP32 modules  
- **Deployment:** Hosted via GitHub + local server (update with your deployment method)

We used GitHub for collaboration, and iterated quickly using short development cycles throughout HackNYU.


- Challenges We Ran Into:
  
- **Real-time sensor communication:** Handling consistent data flow from ESP32 to backend  
- **API limits & formatting:** Ensuring stable packet formatting and preventing desync  
- **UI responsiveness:** Making sure the dashboard updated instantly without lag  
- **Time pressure:** Turning a hardware/software hybrid concept into a working demo during a hackathon window  
- **State management:** Designing a system simple enough to build quickly but flexible enough to scale


- Accomplishments We’re Proud Of:
  
- Built a **fully functional, end-to-end system** that connects ESP32 hardware to a live dashboard  
- Created a **clean, user-friendly interface** for patient health monitoring  
- Implemented a working **real-time data pipeline** from sensors → backend → frontend  
- Developed the foundation for a future **AI-driven, patient-facing assistant**  
- Produced a scalable idea that can be expanded into a hospital-level solution

- What We Learned:
  
- How to structure a **hardware → API → frontend** data pipeline  
- Best practices for **ESP32 communication**, including JSON formatting and transmission frequency  
- How to design interfaces for **fast mental parsing** in medical environments  
- How to coordinate tasks efficiently during a hackathon with multiple moving parts  
- That even small projects benefit from strong architecture decisions early on


- What’s Next for Vitalis:
  
- Integrating **AI agents** to interact directly with patients  
- Expanding multi-room support for entire hospital wards  
- Adding **predictive analytics** (early detection of anomalies)  
- Improving sensor accuracy and coverage  
- Deploying a cloud-based backend for higher scalability  
- Implementing role-based dashboards (nurse, doctor, admin, patient)  
- Packaging into a plug-and-play system for rapid deployment in healthcare settings


- Tech Stack:
Hardware:
- ESP32 sensors  
- Peripheral health sensors (heart rate, temperature, SPO2, etc.)

Software:
- React (frontend)  
- Node.js + Express (backend API)  
- MongoDB (storage as needed)
- REST APIs for sensor ingestion  


## 🔧 Getting Started  

### 1. Clone the Repository

git clone https://github.com/SupratikPanuganti/HackNYU.git
cd HackNYU

### 2. Install Frontend Dependencies

cd frontend
npm install

### 3. Install Backend Dependencies

cd ../backend
npm install

### 4. Run Frontend

npm run start

### 5. Run Backend

npm run dev

### 6. Open

http://localhost:3000



