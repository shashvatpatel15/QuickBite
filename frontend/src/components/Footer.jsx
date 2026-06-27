import React from "react";

const Footer = () => {
  return (
    <footer className="w-full pt-24 pb-12 bg-surface-container-low border-t border-outline-variant/30">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-12 lg:col-span-4 space-y-6">
            <span className="font-display text-2xl font-extrabold text-primary tracking-tight">QuickBite</span>
            <p className="text-secondary text-sm leading-relaxed font-light">
              Delivering your favorite meals from top-rated local restaurants directly to your doorstep in real-time.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 border border-outline-variant/30 rounded-full flex items-center justify-center text-secondary hover:bg-on-surface hover:text-white hover:border-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">public</span>
              </a>
              <a href="#" className="w-10 h-10 border border-outline-variant/30 rounded-full flex items-center justify-center text-secondary hover:bg-on-surface hover:text-white hover:border-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </a>
              <a href="#" className="w-10 h-10 border border-outline-variant/30 rounded-full flex items-center justify-center text-secondary hover:bg-on-surface hover:text-white hover:border-on-surface transition-all">
                <span className="material-symbols-outlined text-[18px]">favorite</span>
              </a>
            </div>
          </div>
          
          <div className="md:col-span-4 lg:col-span-2 lg:col-start-6">
            <h4 className="font-display text-xs font-semibold text-primary uppercase tracking-[0.1em] mb-6">Company</h4>
            <ul className="space-y-4 text-sm font-light text-secondary">
              <li><a href="#" className="hover:text-primary transition-colors">About QuickBite</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sustainability</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Journal / News</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-4 lg:col-span-2">
            <h4 className="font-display text-xs font-semibold text-primary uppercase tracking-[0.1em] mb-6">Partners</h4>
            <ul className="space-y-4 text-sm font-light text-secondary">
              <li><a href="#" className="hover:text-primary transition-colors">Join as a Restaurant</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Become a Rider</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Business Solutions</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Partner Support</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-4 lg:col-span-2">
            <h4 className="font-display text-xs font-semibold text-primary uppercase tracking-[0.1em] mb-6">Support</h4>
            <ul className="space-y-4 text-sm font-light text-secondary">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-secondary text-xs font-light">© {new Date().getFullYear()} QuickBite Delivery Services. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-primary text-xs font-semibold tracking-wide">A real-time food delivery web application built with React and Django.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
