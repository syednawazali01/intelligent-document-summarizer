import React, { useState } from 'react';
import Summarizer from './components/Summarizer';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import About from './components/About';

export type Tab = 'summarizer' | 'chatbot' | 'about';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('summarizer');
  
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'summarizer':
        return <Summarizer />;
      case 'chatbot':
        return <Chatbot />;
      case 'about':
        return <About />;
      default:
        return <Summarizer />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <div className="flex-grow pt-20 pb-6 sm:pb-8"> {/* Adjusted padding for navbar */}
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
          <main className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-lg shadow-2xl overflow-hidden">
            {renderActiveTab()}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default App;