import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-12 bg-foreground text-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">SafeHold</span>
            </Link>
            <p className="text-background/70 text-sm">
              Nigeria's trusted escrow platform for secure B2B and B2P transactions.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link to="#features" className="hover:text-background transition-colors">Features</Link></li>
              <li><Link to="#pricing" className="hover:text-background transition-colors">Pricing</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">API Documentation</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Mobile App</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link to="#" className="hover:text-background transition-colors">About Us</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Careers</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Blog</Link></li>
              <li><Link to="#contact" className="hover:text-background transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-background/70">
              <li><Link to="#" className="hover:text-background transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Escrow Agreement</Link></li>
              <li><Link to="#" className="hover:text-background transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/70">
            © {new Date().getFullYear()} SafeHold. All rights reserved.
          </p>
          <p className="text-sm text-background/70">
            Licensed by CBN | Made with 💚 in Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
};
