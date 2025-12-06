import { CircleDollarSign, Bell, CheckCircle, Wallet } from "lucide-react";

const steps = [
  {
    icon: CircleDollarSign,
    step: "01",
    title: "Create Escrow",
    description: "Client creates an escrow transaction and deposits funds securely into the SafeHold wallet."
  },
  {
    icon: Bell,
    step: "02",
    title: "Vendor Notified",
    description: "Vendor receives instant notification that payment is secured and can begin work with confidence."
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "Work Complete",
    description: "Once the service is delivered, the client reviews and confirms the work is satisfactory."
  },
  {
    icon: Wallet,
    step: "04",
    title: "Funds Released",
    description: "Payment is automatically released to the vendor's wallet or bank account."
  }
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Process</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mt-4 mb-6">
            How SafeHold Works
          </h2>
          <p className="text-muted-foreground text-lg">
            A simple 4-step process that protects both clients and vendors throughout the transaction.
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className="relative text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Step Number */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <div className="relative w-full h-full rounded-full bg-card border-2 border-primary flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
                    {step.step}
                  </span>
                </div>
                
                <h3 className="text-xl font-display font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
