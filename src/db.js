'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'yadea.db');

let db;
function get() {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  return db;
}

const all = (sql, ...p) => get().prepare(sql).all(...p);
const one = (sql, ...p) => get().prepare(sql).get(...p);
const run = (sql, ...p) => get().prepare(sql).run(...p);

module.exports = { get, all, one, run, DB_PATH, fs };
