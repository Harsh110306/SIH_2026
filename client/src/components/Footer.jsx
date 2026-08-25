import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <strong>Online Chatbot Based Ticketing System</strong> — Government Museum & Zoo Platform
        </div>
        <div>
          made with ❤️ by KPGU Student
        </div>
      </div>
    </footer>
  );
}
