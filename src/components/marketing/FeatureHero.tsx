import React from 'react';

/**
 * FeatureHero Component
 * 🦸‍♂️🏮
 * Premium Hero section for the feature overview.
 */
export const FeatureHero: React.FC = () => {
    return (
        <section className="pt-16 pb-12 md:pt-hero-top md:pb-hero-bottom px-6 md:px-page-inline text-center bg-gradient-to-b from-white to-slate-50/50">
            <div className="max-w-[900px] mx-auto">
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                    Intelligenz trifft <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">volle Flexibilität.</span>
                </h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">
                    Entdecken Sie die Werkzeuge, die Koreki zur fortschrittlichsten Korrektur-Assistenz für den modernen Schulalltag machen.
                </p>
            </div>
        </section>
    );
};
