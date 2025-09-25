// models/User.js

// For now, we can use an in-memory array of users
// In production, you should use a proper database

const users = [];

class User {
  constructor(username, password) {
    this.username = username;
    this.password = password; // For testing; in production, hash the password
  }

  static findByUsername(username) {
    return users.find(user => user.username === username);
  }

  static create(username, password) {
    const newUser = new User(username, password);
    users.push(newUser);
    return newUser;
  }

  static getAll() {
    return users;
  }
}

module.exports = User;
