import React from 'react';

/**
 * BackgroundGradients Component
 * 
 * Provides the premium 'Ambient Shell' background blobs for the Koreki application.
 * Part of the 'Industrial Aesthetics' design system.
 */
const BackgroundGradients: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-multiply"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply"></div>
            <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-purple-500/5 blur-[100px] rounded-full mix-blend-multiply"></div>
        </div>
    );
};

export default BackgroundGradients;
