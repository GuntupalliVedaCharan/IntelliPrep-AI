CREATE DATABASE IF NOT EXISTS intelliprep;
USE intelliprep;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  parsed_text TEXT,
  analysis_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resume_id INT,
  title VARCHAR(255) NOT NULL,
  interview_type ENUM('technical', 'hr', 'mixed') DEFAULT 'mixed',
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  overall_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_id INT NOT NULL,
  question_text TEXT NOT NULL,
  category VARCHAR(100),
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  order_index INT DEFAULT 0,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  answer_text TEXT NOT NULL,
  score DECIMAL(5,2),
  feedback_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weak_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic VARCHAR(150) NOT NULL,
  occurrence_count INT DEFAULT 1,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_topic (user_id, topic)
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  resource_type ENUM('article', 'video', 'course', 'documentation') DEFAULT 'article',
  INDEX idx_topic (topic)
);

INSERT INTO learning_resources (topic, title, url, resource_type) VALUES
('JavaScript', 'MDN JavaScript Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 'documentation'),
('JavaScript', 'JavaScript.info Tutorial', 'https://javascript.info/', 'course'),
('React', 'React Official Documentation', 'https://react.dev/learn', 'documentation'),
('React', 'React Tutorial for Beginners', 'https://www.youtube.com/watch?v=SqcY0GlETPk', 'video'),
('Node.js', 'Node.js Official Docs', 'https://nodejs.org/en/docs', 'documentation'),
('Node.js', 'Node.js Crash Course', 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', 'video'),
('SQL', 'SQL Tutorial - W3Schools', 'https://www.w3schools.com/sql/', 'course'),
('SQL', 'MySQL Documentation', 'https://dev.mysql.com/doc/', 'documentation'),
('Data Structures', 'GeeksforGeeks DSA', 'https://www.geeksforgeeks.org/data-structures/', 'article'),
('Algorithms', 'LeetCode Explore', 'https://leetcode.com/explore/', 'course'),
('System Design', 'System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'article'),
('Communication', 'STAR Method for Interviews', 'https://www.themuse.com/advice/star-interview-method', 'article'),
('Leadership', 'Behavioral Interview Questions', 'https://www.indeed.com/career-advice/interviewing/behavioral-interview-questions', 'article'),
('Python', 'Python Official Tutorial', 'https://docs.python.org/3/tutorial/', 'documentation'),
('Java', 'Java Tutorials - Oracle', 'https://docs.oracle.com/javase/tutorial/', 'documentation'),
('API Design', 'REST API Best Practices', 'https://restfulapi.net/', 'article'),
('Git', 'Pro Git Book', 'https://git-scm.com/book/en/v2', 'documentation'),
('Docker', 'Docker Getting Started', 'https://docs.docker.com/get-started/', 'documentation'),
('AWS', 'AWS Free Tier Getting Started', 'https://aws.amazon.com/free/', 'course'),
('Machine Learning', 'Google ML Crash Course', 'https://developers.google.com/machine-learning/crash-course', 'course');
