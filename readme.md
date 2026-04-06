# 📼 Cassette – Slow Music Player

A retro-inspired cassette tape music player that recreates the **physical limitations and emotional experience** of analog listening.

> Not convenience, but experience.

---

## 🎧 Why This App Exists

Modern music apps optimize for speed:

* Skip instantly
* Shuffle endlessly
* Consume passively

Cassette does the opposite.

> You don’t skip music.
> You **listen**.

---

## 🧠 Core Concept

This app intentionally introduces **friction** to recreate the cassette experience:

* ⏳ Waiting is part of listening
* 🎵 Tracks are constrained by time
* 🔄 You must flip the tape manually

---

## ⚙️ Key Features

### 📀 A/B Side System

* Each side = **30 minutes**
* Playback is limited by physical time

---

### 🔊 Noise-Based Playback

* 3s noise at start
* 2s noise between tracks (adjustable)
* Remaining time = continuous noise

---

### 🚫 Intentional Friction

* No instant skip
* Skip requires long press
* No interaction during noise

---

### 🔄 Manual Tape Flip

* Flip from A → B manually
* Playback time is mirrored
* Includes flip animation & sound

---

### 🎞️ Tape Simulation

* Left reel shrinks, right reel grows
* Playback time is visually represented

---

### ✍️ Tape Builder

Create your own cassette:

* Add tracks within time limits
* Reorder tracks
* Adjust noise gaps
* Fill remaining space

---

## 🎨 Design Philosophy

**Minimal + Retro**

* Warm, analog color tones
* Subtle physical depth
* Smooth, non-flashy animations

---

## 🏗️ Tech Stack

* React Native
* Reanimated (animations)
* Expo AV (audio engine)

---

## 🧩 Architecture

The player is **timeline-based**, not track-based:

```
[noise] → [track] → [noise] → [track]
```

Everything (including noise) is treated as a playable item.

---

## 🚀 Getting Started

```bash
npm install
npm start
```

---

## ⚠️ Important Note

This is **not a conventional music player**.

If you're looking for:

* Fast navigation
* Instant skipping
* Background convenience

This app is not for you.

---

## 🎯 Goal

To bring back the feeling of:

> Waiting for music.
> Listening with intention.
> Experiencing time.

---

## 📌 Future Improvements

* Tape themes (skins)
* Advanced noise profiles
* Sharing custom tapes
* Focus / deep work mode

---

## 👤 Author

Built as an exploration of **experience-driven product design**.

---

## 💬 Final Thought

In a world of infinite skip,

this app asks one question:

> What happens if you just listen?
