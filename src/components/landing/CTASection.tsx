import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-accent via-background to-background" />
      
      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-8">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
            Ready to Secure Your Transactions?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of Nigerian businesses and individuals who trust SafeHold for their escrow needs. Start for free today.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button variant="hero" size="xl">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="hero-outline" size="xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
