import { Shield, Zap, Bell, Wallet, Scale, Smartphone } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Escrow",
    description: "Funds are held securely until both parties are satisfied. Bank-level encryption protects every transaction."
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Real-time alerts keep everyone informed at every stage of the transaction lifecycle."
  },
  {
    icon: Wallet,
    title: "Digital Wallet",
    description: "Built-in wallet system for easy deposits, withdrawals, and fund management."
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Automated notifications for payments, milestones, and important updates."
  },
  {
    icon: Scale,
    title: "Dispute Resolution",
    description: "Fair and transparent dispute handling with dedicated support for complex cases."
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Access your escrow dashboard anywhere with our mobile-optimized platform."
  }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mt-4 mb-6">
            Everything You Need for Safe Transactions
          </h2>
          <p className="text-muted-foreground text-lg">
            Our platform provides all the tools to ensure secure, transparent, and efficient escrow services for Nigerian businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
