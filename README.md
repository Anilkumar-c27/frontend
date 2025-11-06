#  Real-Time Collaborative Drawing Canvas

A **multi-user real-time drawing web application** built with **Vanilla JavaScript**, **HTML5 Canvas**, and **Node.js + Socket.io**.
Multiple users can draw together on a shared canvas, see each other’s cursors live, and collaborate seamlessly.

 **Live Demo:** [https://frontend-9p4z.onrender.com](https://frontend-9p4z.onrender.com)

---

##  Features

###  Drawing Tools

* Brush & Eraser tools
* Adjustable stroke width and color
* Smooth line interpolation for natural drawing

###  Real-Time Collaboration

* Live synchronization across users using WebSockets
* Real-time cursor tracking for all connected users
* Automatic updates when users join or leave

###  Canvas Features

* Undo / Redo support (globally synced)
* Efficient offscreen canvas rendering
* High-DPI support (retina-friendly)

###  User System

* Random user name & color assignment
* Active users list displayed in UI
* Cursor labels per user

---

##  Tech Stack

| Layer                | Technology                                        |
| -------------------- | ------------------------------------------------- |
| **Frontend**         | HTML5, CSS3, Vanilla JavaScript                   |
| **Backend**          | Node.js, Express, Socket.io                       |
| **Real-Time Engine** | WebSockets (Socket.io)                            |
| **Deployment**       | Render ([https://render.com](https://render.com)) |

---

##  Local Setup

### 1️ Clone the Repository

```bash
git clone https://github.com/Anilkumar-c27/frontend.git
cd frontend
```

### 2️ Install Dependencies

```bash
npm install
```

### 3️ Start the Server

```bash
npm start
```

The app will be available at:

```
http://localhost:3002
```

---

##  How to Test

###  Single User

1. Run `npm start`
2. Open [http://localhost:3002](http://localhost:3002) in your browser
3. Start drawing on the canvas!

###  Multiple Users

1. Open the app in **two different browser tabs** (or devices).
2. Draw simultaneously — all strokes will sync in real time.
3. Notice each user’s cursor and color are unique.

---

##  Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main UI
│   ├── style.css           # Canvas and UI styling
│   ├── main.js             # App entry point
│   ├── canvas.js           # Canvas drawing logic
│   └── websocket.js        # WebSocket connection handler
├── server/
│   ├── server.js           # Express + Socket.io backend
│   └── drawing-state.js    # (optional) State management
├── package.json
└── README.md
```

---

##  Known Limitations

* Undo/Redo history resets when refreshing.
* No authentication (anonymous sessions only).
* Performance may degrade with 50+ concurrent users.

---

##  Time Spent

| Phase                    | Duration    |
| ------------------------ | ----------- |
| Project setup            | 1 hour      |
| Canvas drawing & tools   | 2 hours     |
| Socket.io real-time sync | 2 hours     |
| Testing & deployment     | 1 hour      |
| **Total**                | **6 hours** |

---

##  Future Improvements

* Add room-based sessions (`/room/:id`)
* Save and reload drawing sessions
* Add shape and text tools
* Integrate Firebase or MongoDB for persistence
* Implement latency compensation for smoother drawing

---

##  License

This project is released under the [MIT License](LICENSE).
Feel free to use, modify, and share.
