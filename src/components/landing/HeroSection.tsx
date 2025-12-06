import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, CheckCircle2, Users, Banknote } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent via-background to-background" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="container relative mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Nigeria's Trusted Escrow Platform
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
              Secure Your{" "}
              <span className="gradient-text">Transactions</span>
              {" "}with Confidence
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl">
              SafeHold bridges the trust gap between buyers and sellers. We securely hold funds until services are fulfilled, protecting both parties in every transaction.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button variant="hero" size="xl">
                  Start Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="#how-it-works">
                <Button variant="hero-outline" size="xl">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>₦500M+ Secured</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-5 h-5 text-primary" />
                <span>10,000+ Users</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-secondary" />
                <span>Bank-Level Security</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-50" />
              
              {/* Dashboard Card */}
              <div className="relative glass-card rounded-2xl p-6 shadow-elevated">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">Active</span>
                  </div>
                  <div className="text-3xl font-display font-bold">₦2,450,000</div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="p-4 rounded-xl bg-accent/50">
                      <Banknote className="w-8 h-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">In Escrow</p>
                      <p className="font-semibold">₦850,000</p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/50">
                      <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                      <p className="text-sm text-muted-foreground">Released</p>
                      <p className="font-semibold">₦1,600,000</p>
                    </div>
                  </div>

                  {/* Recent Transaction */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">Recent Transaction</p>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Website Development</p>
                          <p className="text-xs text-muted-foreground">TechCorp Nigeria</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">₦350,000</p>
                        <p className="text-xs text-success">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
