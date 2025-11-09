import { supabase } from './supabase';

export const seedRewards = async () => {
  const rewards = [
    {
      name: "Premium Hairstyle Access",
      description: "Unlock exclusive hairstyle recommendations and AI-powered styling tips",
      cost: 100
    },
    {
      name: "Advanced Body Analysis",
      description: "Get detailed body type analysis with personalized outfit suggestions",
      cost: 150
    },
    {
      name: "Priority Support",
      description: "Get priority customer support and faster response times",
      cost: 200
    },
    {
      name: "Exclusive Fashion Trends",
      description: "Access to exclusive fashion trends and seasonal recommendations",
      cost: 250
    },
    {
      name: "Personal Stylist Chat",
      description: "30-minute session with our AI personal stylist for custom advice",
      cost: 500
    },
    {
      name: "VIP Status",
      description: "Unlock VIP status with exclusive features and early access to new features",
      cost: 1000
    }
  ];

  try {
    // Check if rewards already exist
    const { data: existingRewards } = await supabase
      .from('rewards')
      .select('id')
      .limit(1);

    if (existingRewards && existingRewards.length > 0) {
      console.log('Rewards already exist, skipping seed');
      return;
    }

    // Insert rewards
    const { error } = await supabase
      .from('rewards')
      .insert(rewards);

    if (error) {
      console.error('Error seeding rewards:', error);
    } else {
      console.log('Rewards seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding rewards:', error);
  }
};

// Call the function if this file is run directly
if (typeof window === 'undefined') {
  seedRewards();
}
