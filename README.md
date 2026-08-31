# 🌍 Wanderlust — Full-Stack Travel & Accommodation Platform

<div align="center">

[![Live Demo](https://img.shields.io/badge/Status-Live%20Deployment-success?style=for-the-badge&logo=render)](https://breastplate-glaring-giraffe.abasthan.app/listings)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express.js-blue?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com)
[![Bootstrap](https://img.shields.io/badge/Frontend-Bootstrap%205%20%2F%20EJS-purple?style=for-the-badge&logo=bootstrap)](https://getbootstrap.com)

**Wanderlust** is a production-ready, full-stack web application designed for travel enthusiasts to discover, create, and manage unique destinations and accommodations worldwide. Built with modern web technologies, it features robust backend routing, secure user authentication, and a fully responsive interface.

[🔗 View Live Application](https://breastplate-glaring-giraffe.abasthan.app/listings)

</div>

---

## 🚀 Executive Summary & Highlights

Wanderlust delivers an end-to-end digital marketplace experience. It bridges travelers and property hosts through a secure, high-performance web architecture. Designed with scalability and clean code principles in mind, the platform implements strict database modeling, role-based authorization, and optimized client-server communication.

* **Live Production Deployment**: Fully hosted and accessible online with secure environment configurations.
* **Enterprise-Grade Authentication**: Implements `passport-local-mongoose` for secure password hashing, salt generation, and session management.
* **Scalable Database Architecture**: Powered by MongoDB Atlas cloud database with structured Mongoose ODM schemas.
* **Modern UI/UX**: Crafted using custom EJS (Embedded JavaScript) templating engines and Bootstrap 5 responsive styling grids.

---

## 🛠️ Tech Stack & Architecture

### **Frontend**
* **Templating Engine**: EJS (Embedded JavaScript Templates) for dynamic server-side rendering.
* **Styling & Layouts**: Bootstrap 5, Custom CSS3, Font Awesome icons.
* **Interactivity**: Vanilla JavaScript for DOM manipulation and client-side form validations.

### **Backend**
* **Runtime Environment**: Node.js
* **Framework**: Express.js (RESTful routing, middleware configuration, MVC architectural pattern).
* **Authentication**: Passport.js, Passport-Local, Express-Session, Connect-Flash.

### **Database & Tools**
* **Database**: MongoDB Atlas (Cloud NoSQL Database).
* **ODM**: Mongoose (Schema validation, relationship modeling, pre/post middleware).
* **Environment Security**: Dotenv for secure environment variable management.
* **Version Control**: Git & GitHub.

---

## ✨ Key Features

1. **Comprehensive CRUD Operations**:
   * Users can create, read, update, and delete travel listings with rich descriptions, price attributes, and location markers.
   * Secure authorization ensures that only listing owners or administrators can modify or remove properties.

2. **Advanced Authentication & Security**:
   * Secure user signup, login, and logout workflows.
   * Encrypted credential storage using industry-standard hashing and salting techniques.
   * Dedicated Admin management capabilities for system-level controls.

3. **Interactive Review & Rating System**:
   * Authenticated users can leave reviews and ratings on specific listings to share experiences.

4. **Responsive & Adaptive Design**:
   * Mobile-first layout optimized seamlessly across desktops, tablets, and smartphones.

---

## 📂 Project Directory Structure

```text
Wanderlust/
├── controllers/       # Route logic and business operations
├── models/            # Mongoose schemas (Listing, User, Review, Admin)
├── public/            # Static assets (CSS, JS, custom images, favicons)
├── routes/            # Express router modules (listings, reviews, users)
├── views/             # EJS templates (layouts, includes, listings views)
├── utils/             # Error handling wrappers and utility functions
├── .env               # Environment configuration (hidden)
├── app.js             # Main application entry point
└── package.json       # Project dependencies and metadata
