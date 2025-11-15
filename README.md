# automated-smart-home-web

A web application for controlling the **Cat Automated Smart Home** system.  
Provides user authentication, device status monitoring, and real-time control of ESP32-based peripherals.

## Architecture

                ┌────────────────────────────┐
                │        Web Browser         │
                │  (index.html / dashboard)  │
                └──────────────┬─────────────┘
                               │
                               │ HTTPS (Firebase CDN + RTDB)
                               ▼
                ┌────────────────────────────┐
                │          Firebase          │
                │ ┌───────────┬───────────┐  │
                │ │ Firebase  │ Firebase  │  │
                │ │   Auth    │    RTDB   │  │
                │ └───────────┴───────────┘  │
                └──────────────┬─────────────┘
                               │
                               │ Wi-Fi (Outbound HTTPS)
                               ▼
                  ┌────────────────────────┐
                  │         ESP32          │
                  │   - Reads RTDB state   │
                  │   - Writes sensor data │
                  │   - Controls GPIO      │
                  └───────────┬────────────┘
                              │
                       (GPIO Output/Input)
                              │
                              ▼
                    ┌───────────────────┐
                    │    GPIO Devices   │
                    │ (Heating Pad,     │
                    │  Temp sensor,     |
                    │  etc.)            │
                    └───────────────────┘


## Features
- **Firebase Authentication**
  - Email/password login  
  - Google Sign-In  
- **Dashboard for Device Control**
  - Heating pad
  - Temperature sensor
  - Camera orientation
  - 
- **Real-time Updates**
  - UI reflects device state changes instantly  

## Tech Stack
- **Firebase**
  - Auth  
  - Realtime Database  
- **HTML, CSS, JavaScript** 
- **Device Communication:**
  - ESP32 writes/reads device state via RTDB  
  - Web app controls devices by updating database paths

