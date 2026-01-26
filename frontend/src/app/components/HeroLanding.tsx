import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Brain, FileText, Zap, ChartNetwork, Lock } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';
import { Starfield } from './Starfield';

interface HeroLandingProps {
  onLaunchAuditor: () => void;
}

export function HeroLanding({ onLaunchAuditor }: HeroLandingProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.3) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const titleWords = "Synthetic Auditor".split(' ');
  
  const features = [
    {
      icon: ChartNetwork,
      title: "Evidence Chain",
      description: "Traceable vulnerability analysis with full provenance",
      delay: 0.2
    },
    {
      icon: Brain,
      title: "Local LLM",
      description: "GPU-accelerated AI processing on your hardware",
      badge: "GPU",
      delay: 0.4
    },
    {
      icon: FileText,
      title: "Dual Reports",
      description: "Executive summaries + technical deep-dives",
      delay: 0.6
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden" 
         style={{ 
           background: 'linear-gradient(180deg, #0B0F19 0%, #1A1F2E 100%)',
           fontFamily: 'var(--font-body)'
         }}>
      <Starfield />
      <ParticleBackground />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h1 
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 8vw, 72px)',
              fontWeight: 300,
              background: 'linear-gradient(90deg, #00D4FF 0%, #8A2BE2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.02em'
            }}
          >
            {titleWords.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                className="inline-block mr-4"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{ 
              color: '#94A3B8',
              fontSize: 'clamp(18px, 3vw, 24px)',
              fontWeight: 300
            }}
          >
            Offline AI-Powered Security Intelligence
          </motion.p>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mb-12 px-6 py-3 rounded-full backdrop-blur-md"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#00D4FF',
            letterSpacing: '0.05em'
          }}
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4" />
            <span>100% Local Processing</span>
            <span className="opacity-50">•</span>
            <span>Zero Data Exfiltration</span>
            <span className="opacity-50">•</span>
            <span>Evidence-Based Analysis</span>
          </div>
        </motion.div>

        {/* Central Shield Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8, type: "spring" }}
          className="mb-16 relative"
        >
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Rotating outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid rgba(0, 212, 255, 0.3)',
                transform: `rotate(${rotation}deg)`
              }}
            >
              {[0, 90, 180, 270].map((angle) => (
                <div
                  key={angle}
                  className="absolute w-2 h-2 rounded-full bg-cyan-400"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-90px)`
                  }}
                />
              ))}
            </motion.div>

            {/* Pulsing glow */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)',
              }}
            />

            {/* Hexagonal AI Badge */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative z-10"
            >
              {/* Hexagon Background */}
              <svg width="120" height="120" viewBox="0 0 120 120" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00D4FF', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#8A2BE2', stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
                <polygon 
                  points="60,10 100,35 100,75 60,100 20,75 20,35" 
                  fill="url(#hexGradient)"
                  stroke="#00D4FF"
                  strokeWidth="2"
                />
              </svg>
              
              {/* Inner circuit pattern */}
              <div className="relative w-24 h-24">
                {/* Central brain/AI node */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #00D4FF, #8A2BE2)',
                    boxShadow: '0 0 20px rgba(0, 212, 255, 0.8)'
                  }}
                />
                
                {/* Circuit nodes around center */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.div
                    key={angle}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: i % 2 === 0 ? '#00D4FF' : '#8A2BE2',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-30px)`,
                      boxShadow: `0 0 10px ${i % 2 === 0 ? 'rgba(0, 212, 255, 0.8)' : 'rgba(138, 43, 226, 0.8)'}`
                    }}
                  />
                ))}
                
                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: '#00D4FF', stopOpacity: 0.4 }} />
                      <stop offset="100%" style={{ stopColor: '#8A2BE2', stopOpacity: 0.4 }} />
                    </linearGradient>
                  </defs>
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const nextAngle = (angle + 60) % 360;
                    const x1 = 48 + 30 * Math.cos((angle * Math.PI) / 180);
                    const y1 = 48 + 30 * Math.sin((angle * Math.PI) / 180);
                    const x2 = 48 + 30 * Math.cos((nextAngle * Math.PI) / 180);
                    const y2 = 48 + 30 * Math.sin((nextAngle * Math.PI) / 180);
                    return (
                      <line
                        key={angle}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="url(#lineGradient)"
                        strokeWidth="1"
                      />
                    );
                  })}
                </svg>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl w-full">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + feature.delay, duration: 0.6 }}
              whileHover={{ 
                y: -8,
                transition: { duration: 0.2 }
              }}
              className="relative p-6 rounded-2xl backdrop-blur-md group cursor-pointer"
              style={{
                background: 'rgba(26, 31, 46, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{
                     background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(138, 43, 226, 0.1))',
                   }}
              />
              
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="p-3 rounded-lg"
                       style={{
                         background: 'rgba(0, 212, 255, 0.1)',
                         border: '1px solid rgba(0, 212, 255, 0.3)'
                       }}>
                    <feature.icon className="w-6 h-6" style={{ color: '#00D4FF' }} />
                  </div>
                  {feature.badge && (
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        background: 'rgba(138, 43, 226, 0.2)',
                        color: '#8A2BE2',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid rgba(138, 43, 226, 0.3)'
                      }}
                    >
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 
                  className="mb-2"
                  style={{
                    color: '#F8FAFC',
                    fontFamily: 'var(--font-body)',
                    fontSize: '18px',
                    fontWeight: 500
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ 
                  color: '#94A3B8',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLaunchAuditor}
          className="relative px-12 py-5 rounded-xl overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
            fontSize: '18px',
            fontWeight: 500,
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 40px rgba(0, 212, 255, 0.4)'
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
                'linear-gradient(135deg, #8A2BE2 0%, #00D4FF 100%)',
                'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <span className="relative z-10 flex items-center gap-3">
            Launch Auditor
            <Zap className="w-5 h-5" />
          </span>
        </motion.button>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <div 
            className="w-32 h-px mx-auto mb-4"
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
          />
          <p style={{ 
            color: '#64748B',
            fontSize: '11px',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.05em'
          }}>
            Made by Straw Hat Crew (PEC)
          </p>
        </motion.div>
      </div>
    </div>
  );
}