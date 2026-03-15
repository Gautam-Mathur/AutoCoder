import type { ProjectRequirements, DataModel } from './pro-generator';

export interface SynthesizedContent {
  products: Array<{
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image: string;
    rating: number;
    reviews: number;
    inStock: boolean;
  }>;
  productCategories: string[];

  metrics: Array<{
    label: string;
    value: number;
    change: number;
    prefix: string;
    suffix: string;
    icon: string;
  }>;
  recentActivity: Array<{
    id: number;
    user: string;
    action: string;
    amount: number | null;
    time: string;
    avatar: string;
  }>;
  chartData: Array<{ name: string; revenue: number; users: number }>;
  topItems: Array<{ name: string; sales: number; revenue: number; trend: string }>;

  tasks: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assignee: string;
  }>;

  posts: Array<{
    id: number;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    authorAvatar: string;
    date: string;
    category: string;
    readTime: string;
    image: string;
    tags: string[];
  }>;
  blogCategories: string[];

  portfolioProjects: Array<{
    id: number;
    title: string;
    description: string;
    image: string;
    tags: string[];
    link: string;
    github: string;
  }>;

  landingFeatures: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  pricingPlans: Array<{
    name: string;
    price: number;
    period: string;
    features: string[];
    cta: string;
    popular: boolean;
  }>;
  faqs: Array<{ q: string; a: string }>;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;

  chatContacts: Array<{
    id: number;
    name: string;
    lastMessage: string;
    timestamp: string;
    avatar: string;
    online: boolean;
    unread: number;
  }>;
  chatMessages: Record<number, Array<{
    id: number;
    sender: string;
    text: string;
    timestamp: string;
    isMe: boolean;
  }>>;

  people: Array<{ name: string; avatar: string; role: string }>;
  domainLabel: string;
  itemSingular: string;
  itemPlural: string;
  tagline: string;
  aboutText: string;
}

class SeededRNG {
  private state: number;

  constructor(seed: string) {
    this.state = 0;
    for (let i = 0; i < seed.length; i++) {
      this.state = ((this.state << 5) - this.state + seed.charCodeAt(i)) | 0;
    }
    if (this.state === 0) this.state = 1;
  }

  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return ((this.state >>> 0) / 4294967296);
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number, decimals: number = 2): number {
    const val = this.next() * (max - min) + min;
    return parseFloat(val.toFixed(decimals));
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = this.int(0, copy.length - 1);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Casey', 'Taylor', 'Riley', 'Quinn', 'Avery',
  'Cameron', 'Dakota', 'Emery', 'Finley', 'Harper', 'Sage', 'Rowan', 'Skyler',
  'Priya', 'Kenji', 'Aisha', 'Marco', 'Yuki', 'Lena', 'Omar', 'Sofia',
  'Ravi', 'Mei', 'Carlos', 'Amara', 'Noah', 'Zara', 'Ethan', 'Leila',
  'Samuel', 'Nina', 'Daniel', 'Elena', 'James', 'Fatima', 'David', 'Anya',
  'Lucas', 'Mia', 'Oliver', 'Chloe', 'Liam', 'Isla', 'Mason', 'Aria',
];

const LAST_NAMES = [
  'Chen', 'Patel', 'Garcia', 'Kim', 'Nguyen', 'Anderson', 'Tanaka', 'Silva',
  'Okafor', 'Johansson', 'Dubois', 'Ivanov', 'Singh', 'Rossi', 'Muller', 'Park',
  'Williams', 'Brown', 'Johnson', 'Martinez', 'Lee', 'Robinson', 'Clark', 'Lewis',
];

const AVATAR_IDS = [
  '1535713875002-d1d0cf377fde', '1494790108377-be9c29b29330', '1507003211169-0a1dd7228f2d',
  '1527980965255-5332b567eb65', '1438761681033-6461ffad8d80', '1472099645785-5658abf4ff4e',
  '1544005313-94ddf0286df2', '1500648767791-00dcc994a43e', '1534528741775-53994a69daeb',
  '1506794778202-cad84cf45f1d', '1517841905240-472988babdf9', '1539571696357-5a69c17a67c6',
  '1524504388940-b1c1722653e1', '1522075469751-3a6694fb2f61', '1488426862026-3ee34a7d66df',
  '1560250097-0b93528c311a',
];

interface DomainConfig {
  label: string;
  itemSingular: string;
  itemPlural: string;
  taglineTemplate: string;
  aboutTemplate: string;
  productNames: string[];
  productDescriptions: string[];
  categories: string[];
  metricLabels: string[];
  metricIcons: string[];
  metricPrefixes: string[];
  metricSuffixes: string[];
  actions: string[];
  taskVerbs: string[];
  blogTopics: string[];
  blogTags: string[];
  featureTitles: string[];
  featureDescriptions: string[];
  faqQuestions: string[];
  faqAnswers: string[];
  photoIds: string[];
  priceRange: [number, number];
  roles: string[];
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  fitness: {
    label: 'Fitness',
    itemSingular: 'Workout',
    itemPlural: 'Workouts',
    taglineTemplate: 'Your personal fitness companion for reaching every goal',
    aboutTemplate: '{appName} helps you track workouts, monitor progress, and achieve your fitness goals with data-driven insights and personalized recommendations.',
    productNames: ['HIIT Cardio Blast', 'Strength Training Pro', 'Yoga Flow Session', 'Core Crusher', 'Full Body Circuit', 'Sprint Interval', 'Flexibility Routine', 'Powerlifting Basics', 'Pilates Sculpt', 'Endurance Builder', 'Kettlebell Swing Set', 'Morning Stretch'],
    productDescriptions: ['Intense interval training to maximize calorie burn', 'Build lean muscle with progressive overload techniques', 'Improve flexibility and mental clarity', 'Target your core with dynamic movements', 'Complete workout hitting every muscle group', 'Boost your speed and cardiovascular capacity', 'Enhance range of motion and recovery', 'Foundation exercises for heavy lifting', 'Low-impact toning and lengthening', 'Build stamina for long-duration activities', 'Dynamic full-body conditioning', 'Gentle morning activation routine'],
    categories: ['Cardio', 'Strength', 'Flexibility', 'HIIT', 'Recovery', 'Endurance'],
    metricLabels: ['Calories Burned', 'Workouts Completed', 'Active Minutes', 'Avg Heart Rate'],
    metricIcons: ['Flame', 'Dumbbell', 'Clock', 'Heart'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: [' kcal', '', ' min', ' bpm'],
    actions: ['completed a workout', 'set a new personal record', 'logged a run', 'finished a yoga session', 'hit a calorie goal', 'started a new program'],
    taskVerbs: ['Complete', 'Schedule', 'Track', 'Plan', 'Review', 'Update'],
    blogTopics: ['Building Muscle Efficiently', 'Recovery Day Best Practices', 'Nutrition for Athletes', 'Home Workout Routines', 'Stretching Before Training', 'Tracking Your Progress'],
    blogTags: ['fitness', 'health', 'workout', 'nutrition', 'strength', 'cardio', 'recovery', 'training'],
    featureTitles: ['Workout Tracking', 'Progress Analytics', 'Custom Programs', 'Nutrition Log', 'Goal Setting', 'Community Challenges'],
    featureDescriptions: ['Log every set, rep, and mile with detailed tracking', 'Visualize your gains with beautiful progress charts', 'Build personalized workout plans for your goals', 'Track macros and calories alongside your training', 'Set measurable targets and celebrate milestones', 'Compete with friends and stay motivated together'],
    faqQuestions: ['How do I log a workout?', 'Can I create custom exercises?', 'How is calorie burn calculated?', 'Can I sync with wearable devices?', 'Is there a free trial?'],
    faqAnswers: ['Simply tap the + button and select your exercises, sets, and reps.', 'Yes, you can create unlimited custom exercises with your own categories.', 'We use industry-standard MET calculations based on exercise type and duration.', 'We support integration with most popular fitness trackers and smartwatches.', 'Absolutely! Enjoy full access free for 14 days with no commitment.'],
    photoIds: ['1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b', '1517836357463-d25dceac3c13', '1518611012118-696072aa579a', '1540497077202-7c8a3999166f', '1576678927484-cc907957088c'],
    priceRange: [9, 79],
    roles: ['Trainer', 'Nutritionist', 'Coach', 'Athlete', 'Member'],
  },
  restaurant: {
    label: 'Restaurant',
    itemSingular: 'Menu Item',
    itemPlural: 'Menu Items',
    taglineTemplate: 'Discover exceptional flavors crafted with passion',
    aboutTemplate: '{appName} brings together culinary excellence and warm hospitality. Every dish is prepared with the freshest ingredients and a dedication to memorable dining experiences.',
    productNames: ['Truffle Mushroom Risotto', 'Grilled Salmon Teriyaki', 'Classic Caesar Salad', 'Wagyu Beef Burger', 'Margherita Pizza', 'Pan-Seared Duck Breast', 'Lobster Bisque', 'Thai Green Curry', 'Tiramisu', 'Crispy Calamari', 'Poke Bowl', 'Braised Short Ribs'],
    productDescriptions: ['Creamy arborio rice with wild mushrooms and truffle oil', 'Fresh Atlantic salmon with house-made teriyaki glaze', 'Crisp romaine with parmesan and anchovy dressing', 'Premium wagyu patty with aged cheddar and brioche bun', 'Wood-fired pizza with San Marzano tomatoes and fresh mozzarella', 'Tender duck breast with cherry reduction and roasted vegetables', 'Rich and velvety soup with fresh lobster meat', 'Fragrant coconut curry with seasonal vegetables and jasmine rice', 'Classic Italian dessert with espresso-soaked ladyfingers', 'Golden fried calamari with marinara dipping sauce', 'Fresh tuna and salmon over seasoned sushi rice', 'Slow-cooked beef ribs in red wine reduction'],
    categories: ['Appetizers', 'Entrees', 'Desserts', 'Beverages', 'Sides', 'Specials'],
    metricLabels: ['Orders Today', 'Revenue', 'Avg Rating', 'Active Tables'],
    metricIcons: ['ShoppingBag', 'DollarSign', 'Star', 'Users'],
    metricPrefixes: ['', '$', '', ''],
    metricSuffixes: ['', '', '/5', ''],
    actions: ['placed an order', 'left a review', 'made a reservation', 'ordered takeout', 'redeemed a coupon', 'joined the loyalty program'],
    taskVerbs: ['Prepare', 'Update', 'Restock', 'Clean', 'Organize', 'Review'],
    blogTopics: ['Farm to Table Philosophy', 'Seasonal Menu Highlights', 'Wine Pairing Guide', 'Behind the Kitchen', 'Local Ingredient Spotlight', 'Chef Interview Series'],
    blogTags: ['food', 'dining', 'restaurant', 'recipes', 'chef', 'cuisine', 'seasonal', 'local'],
    featureTitles: ['Online Ordering', 'Table Reservations', 'Loyalty Rewards', 'Digital Menu', 'Order Tracking', 'Catering Services'],
    featureDescriptions: ['Order your favorite dishes with just a few taps', 'Book your table instantly and skip the wait', 'Earn points with every order and unlock exclusive perks', 'Browse our full menu with photos and dietary info', 'Track your delivery in real-time from kitchen to door', 'Let us handle your next event with customized catering'],
    faqQuestions: ['Do you offer delivery?', 'Can I make dietary modifications?', 'How does the loyalty program work?', 'Do you accept reservations?', 'Is there parking available?'],
    faqAnswers: ['Yes, we deliver within a 10-mile radius through our app and website.', 'Absolutely! Let your server know and our kitchen will accommodate allergies and preferences.', 'Earn 1 point per dollar spent. Redeem 100 points for $10 off your next meal.', 'Yes, you can book online or call us directly. Walk-ins are also welcome.', 'We have a complimentary parking lot and valet service on weekends.'],
    photoIds: ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0', '1504674900247-0877df9cc836', '1555396273-367ea4eb4db5', '1565299624946-b28f40a0ae38', '1476224203421-9ac39bcb3327'],
    priceRange: [8, 65],
    roles: ['Head Chef', 'Server', 'Manager', 'Sommelier', 'Host'],
  },
  recipe: {
    label: 'Recipe',
    itemSingular: 'Recipe',
    itemPlural: 'Recipes',
    taglineTemplate: 'Share, discover, and cook amazing recipes from around the world',
    aboutTemplate: '{appName} is a community-driven recipe platform where food lovers share their favorite dishes, discover new cuisines, and master cooking techniques together.',
    productNames: ['Homemade Pasta Carbonara', 'Spicy Thai Basil Stir-Fry', 'Classic French Onion Soup', 'Chocolate Lava Cake', 'Greek Mezze Platter', 'Vietnamese Pho', 'BBQ Pulled Pork Tacos', 'Matcha Cheesecake', 'Moroccan Chicken Tagine', 'Fresh Spring Rolls', 'Banana Bread', 'Mushroom Wellington'],
    productDescriptions: ['Rich and creamy Italian classic with guanciale and pecorino', 'Bold flavors with fresh Thai basil and crispy tofu', 'Caramelized onions in rich beef broth topped with gruyere', 'Decadent molten chocolate center with a delicate crust', 'Assorted Mediterranean dips and fresh flatbread', 'Fragrant beef broth with rice noodles and fresh herbs', 'Smoky slow-cooked pork with tangy slaw in corn tortillas', 'Creamy Japanese-inspired cheesecake with vibrant matcha', 'Aromatic spiced chicken with preserved lemons and olives', 'Light rice paper wraps filled with vegetables and shrimp', 'Moist and sweet with ripe bananas and warm spices', 'Savory pastry filled with mushrooms and herbs'],
    categories: ['Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Snacks', 'Drinks'],
    metricLabels: ['Recipes Shared', 'Community Members', 'Recipes Tried', 'Avg Cook Time'],
    metricIcons: ['BookOpen', 'Users', 'ChefHat', 'Clock'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '', ' min'],
    actions: ['shared a new recipe', 'tried a recipe', 'left a review', 'saved to favorites', 'uploaded a photo', 'created a collection'],
    taskVerbs: ['Try', 'Share', 'Review', 'Save', 'Create', 'Edit'],
    blogTopics: ['Essential Kitchen Tools', 'Cooking Techniques for Beginners', 'Seasonal Ingredient Guide', 'Meal Prep Strategies', 'Global Cuisine Exploration', 'Baking Science Explained'],
    blogTags: ['cooking', 'recipes', 'baking', 'ingredients', 'techniques', 'kitchen', 'meal-prep', 'cuisine'],
    featureTitles: ['Recipe Sharing', 'Ingredient Lists', 'Step-by-Step Guides', 'Meal Planning', 'Nutrition Info', 'Community Reviews'],
    featureDescriptions: ['Share your culinary creations with a global community', 'Generate shopping lists from any recipe instantly', 'Follow clear visual instructions for every dish', 'Plan your weekly meals and auto-generate grocery lists', 'View detailed nutritional breakdowns for every recipe', 'Read honest reviews and tips from fellow home cooks'],
    faqQuestions: ['How do I submit a recipe?', 'Can I adjust serving sizes?', 'Are nutritional values accurate?', 'Can I save recipes offline?', 'How do community ratings work?'],
    faqAnswers: ['Tap the + button, add your ingredients, steps, and photos, then publish!', 'Yes, use the serving adjuster to automatically scale ingredients up or down.', 'Nutritional data is calculated using a comprehensive ingredient database.', 'Yes, save any recipe to your offline collection for kitchen use without internet.', 'Users rate recipes 1-5 stars after trying them. The average is displayed on each recipe.'],
    photoIds: ['1466637574441-749b8f19452f', '1490645935967-10de6ba17061', '1495521821757-a1efb6729352', '1504674900247-0877df9cc836', '1547592180-85f173990554', '1556909114-f6e7ad7d3136'],
    priceRange: [5, 45],
    roles: ['Home Cook', 'Food Blogger', 'Chef', 'Nutritionist', 'Baker'],
  },
  finance: {
    label: 'Finance',
    itemSingular: 'Transaction',
    itemPlural: 'Transactions',
    taglineTemplate: 'Take control of your finances with smart insights',
    aboutTemplate: '{appName} empowers you to manage budgets, track expenses, and make informed financial decisions with powerful analytics and real-time monitoring.',
    productNames: ['Premium Budget Plan', 'Investment Tracker', 'Expense Analyzer', 'Savings Goal Manager', 'Tax Preparation Kit', 'Debt Payoff Planner', 'Income Dashboard', 'Bill Reminder System', 'Portfolio Optimizer', 'Cash Flow Forecaster', 'Retirement Calculator', 'Currency Converter'],
    productDescriptions: ['Comprehensive budgeting with category-based tracking', 'Monitor your investment portfolio performance in real-time', 'Detailed breakdown of spending patterns and trends', 'Set and track savings goals with visual progress indicators', 'Simplify tax season with organized expense documentation', 'Strategic plan to eliminate debt efficiently', 'Visualize all income streams in one unified view', 'Never miss a payment with smart bill reminders', 'AI-driven suggestions for portfolio rebalancing', 'Predict future cash flow based on historical patterns', 'Plan for retirement with customizable projections', 'Real-time exchange rates for global currencies'],
    categories: ['Banking', 'Investments', 'Budgeting', 'Tax', 'Insurance', 'Savings'],
    metricLabels: ['Total Balance', 'Monthly Spending', 'Savings Rate', 'Investments'],
    metricIcons: ['Wallet', 'TrendingDown', 'PiggyBank', 'LineChart'],
    metricPrefixes: ['$', '$', '', '$'],
    metricSuffixes: ['', '', '%', ''],
    actions: ['made a payment', 'received a deposit', 'set a budget alert', 'transferred funds', 'reviewed expenses', 'updated a goal'],
    taskVerbs: ['Review', 'Pay', 'Transfer', 'Reconcile', 'Budget', 'Forecast'],
    blogTopics: ['Building an Emergency Fund', 'Smart Investment Strategies', 'Tax-Saving Tips', 'Debt Reduction Methods', 'Retirement Planning Basics', 'Understanding Credit Scores'],
    blogTags: ['finance', 'budgeting', 'investing', 'savings', 'tax', 'money', 'wealth', 'retirement'],
    featureTitles: ['Budget Tracking', 'Expense Analytics', 'Goal Setting', 'Bill Management', 'Investment Monitoring', 'Financial Reports'],
    featureDescriptions: ['Create and manage budgets across unlimited categories', 'Understand your spending with interactive charts and insights', 'Set financial goals and track your progress automatically', 'Manage recurring bills and never miss a payment deadline', 'Track stocks, bonds, and crypto in a unified dashboard', 'Generate detailed financial reports for any time period'],
    faqQuestions: ['Is my financial data secure?', 'Can I connect my bank accounts?', 'How are budgets calculated?', 'Can I export my data?', 'Is there a mobile app?'],
    faqAnswers: ['We use bank-level 256-bit encryption and never store your login credentials.', 'Yes, securely link accounts from over 10,000 financial institutions.', 'Budgets are based on your set limits minus actual spending, updated in real-time.', 'Export to CSV, PDF, or Excel at any time from the Reports section.', 'Yes, our mobile app is available for both iOS and Android with full feature parity.'],
    photoIds: ['1554224155-6726b3ff858f', '1611974789855-9c2a0a7236a3', '1579621970563-9ae2e01a354b', '1460925895917-afdab827c52f', '1553729459-afe14108a159', '1526304640581-d334cdbbf45e'],
    priceRange: [0, 299],
    roles: ['Financial Advisor', 'Accountant', 'Analyst', 'Manager', 'Auditor'],
  },
  realestate: {
    label: 'Real Estate',
    itemSingular: 'Property',
    itemPlural: 'Properties',
    taglineTemplate: 'Find your dream home with confidence',
    aboutTemplate: '{appName} connects buyers, sellers, and renters with the perfect properties. Browse listings, schedule viewings, and make informed decisions with detailed market insights.',
    productNames: ['Modern Downtown Loft', 'Suburban Family Home', 'Beachfront Condo', 'Mountain Retreat Cabin', 'Luxury Penthouse Suite', 'Cozy Studio Apartment', 'Historic Brownstone', 'Lakefront Villa', 'Urban Townhouse', 'Country Estate', 'Garden Apartment', 'Skyline View Flat'],
    productDescriptions: ['Open-concept loft with floor-to-ceiling windows in the arts district', 'Spacious 4-bedroom home with large backyard and modern kitchen', 'Wake up to ocean views in this recently renovated two-bedroom unit', 'Secluded cabin surrounded by nature with modern amenities', 'Top-floor luxury living with panoramic city views', 'Efficiently designed space perfect for young professionals', 'Charming restored townhouse with original architectural details', 'Waterfront living with private dock and sunset views', 'Multi-level urban living with rooftop terrace', 'Expansive property with acreage and guest house', 'Ground-floor unit with private garden access', 'High-rise apartment with stunning skyline panorama'],
    categories: ['Houses', 'Apartments', 'Condos', 'Commercial', 'Land', 'Luxury'],
    metricLabels: ['Active Listings', 'Avg Price', 'Properties Sold', 'New This Week'],
    metricIcons: ['Building', 'DollarSign', 'CheckCircle', 'TrendingUp'],
    metricPrefixes: ['', '$', '', ''],
    metricSuffixes: ['', '', '', ''],
    actions: ['listed a property', 'scheduled a viewing', 'made an offer', 'saved a listing', 'requested info', 'left a review'],
    taskVerbs: ['List', 'Schedule', 'Inspect', 'Appraise', 'Negotiate', 'Close'],
    blogTopics: ['First-Time Buyer Guide', 'Home Staging Tips', 'Market Trends Analysis', 'Mortgage Rate Updates', 'Neighborhood Spotlights', 'Investment Property Strategies'],
    blogTags: ['realestate', 'homes', 'property', 'mortgage', 'investing', 'market', 'buying', 'selling'],
    featureTitles: ['Property Search', 'Virtual Tours', 'Market Analysis', 'Mortgage Calculator', 'Saved Searches', 'Agent Connect'],
    featureDescriptions: ['Search thousands of listings with powerful filters', 'Explore properties from home with immersive 3D tours', 'Access real-time market data and pricing trends', 'Calculate monthly payments and compare loan options', 'Save your searches and get alerts for new matches', 'Connect directly with experienced local agents'],
    faqQuestions: ['How do I list my property?', 'Are virtual tours available?', 'How accurate are price estimates?', 'Can I schedule viewings online?', 'What fees are involved?'],
    faqAnswers: ['Create an account, click List Property, and follow the guided steps with photos.', 'Yes, many listings include 3D virtual tours you can explore from anywhere.', 'Our estimates use recent sales data and are typically within 5% of market value.', 'Yes, use the Schedule Viewing button on any listing to pick a date and time.', 'Browsing is free. Listing fees vary by plan—see our pricing page for details.'],
    photoIds: ['1564013799919-ab600027ffc6', '1512917774080-9991f1c4c750', '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1605276374104-dee2a0ed3cd6'],
    priceRange: [150000, 2500000],
    roles: ['Agent', 'Broker', 'Inspector', 'Appraiser', 'Buyer'],
  },
  education: {
    label: 'Education',
    itemSingular: 'Course',
    itemPlural: 'Courses',
    taglineTemplate: 'Learn new skills and advance your career',
    aboutTemplate: '{appName} offers world-class courses taught by industry experts. Whether you are a beginner or professional, find the knowledge you need to grow and succeed.',
    productNames: ['Web Development Bootcamp', 'Data Science Fundamentals', 'UI/UX Design Mastery', 'Machine Learning A-Z', 'Mobile App Development', 'Cloud Architecture', 'Cybersecurity Essentials', 'Digital Marketing Strategy', 'Project Management Pro', 'Python Programming', 'Business Analytics', 'Creative Writing Workshop'],
    productDescriptions: ['Comprehensive full-stack web development from scratch to deployment', 'Master statistics, Python, and data visualization techniques', 'Design beautiful and intuitive user interfaces and experiences', 'From regression to neural networks with hands-on projects', 'Build cross-platform mobile apps with React Native and Flutter', 'Design scalable cloud infrastructure on major platforms', 'Protect systems and data with modern security practices', 'Master SEO, social media, and content marketing strategies', 'Lead projects effectively with agile and traditional methodologies', 'From basics to advanced Python with real-world applications', 'Transform data into actionable business intelligence', 'Develop your voice and craft compelling narratives'],
    categories: ['Technology', 'Business', 'Design', 'Marketing', 'Science', 'Arts'],
    metricLabels: ['Students Enrolled', 'Courses Available', 'Completion Rate', 'Avg Rating'],
    metricIcons: ['GraduationCap', 'BookOpen', 'Award', 'Star'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '%', '/5'],
    actions: ['enrolled in a course', 'completed a lesson', 'earned a certificate', 'submitted an assignment', 'asked a question', 'left a review'],
    taskVerbs: ['Study', 'Complete', 'Review', 'Submit', 'Practice', 'Attend'],
    blogTopics: ['Learning Path Recommendations', 'Study Habit Optimization', 'Industry Certification Guide', 'Career Transition Stories', 'Online vs In-Person Learning', 'Skill Gap Analysis'],
    blogTags: ['education', 'learning', 'courses', 'skills', 'career', 'online', 'certification', 'development'],
    featureTitles: ['Interactive Lessons', 'Progress Tracking', 'Certificates', 'Discussion Forums', 'Mentorship', 'Offline Access'],
    featureDescriptions: ['Engage with hands-on exercises and real-world projects', 'Track your learning journey with detailed progress dashboards', 'Earn recognized certificates upon course completion', 'Connect with peers and instructors in topic-based forums', 'Get personalized guidance from industry professionals', 'Download lessons for learning on the go without internet'],
    faqQuestions: ['Are courses self-paced?', 'Do I get a certificate?', 'Can I access courses on mobile?', 'Is there a money-back guarantee?', 'How long do I have access?'],
    faqAnswers: ['Yes, all courses are self-paced so you can learn on your own schedule.', 'Yes, earn a shareable certificate upon completing any course.', 'Absolutely! Our platform works on all devices with offline download support.', 'We offer a 30-day money-back guarantee if you are not satisfied.', 'Once enrolled, you have lifetime access to the course materials.'],
    photoIds: ['1523050854058-8df90110c9f1', '1501504905252-473c47e087f8', '1524178232363-1fb2b075b655', '1509062522246-3755977927d7', '1427504494785-3a9ca7044f45', '1513258496099-48168024aec0'],
    priceRange: [19, 199],
    roles: ['Instructor', 'Student', 'Mentor', 'Teaching Assistant', 'Administrator'],
  },
  healthcare: {
    label: 'Healthcare',
    itemSingular: 'Service',
    itemPlural: 'Services',
    taglineTemplate: 'Your health, our priority — quality care made accessible',
    aboutTemplate: '{appName} provides comprehensive healthcare services with a patient-first approach. Book appointments, access medical records, and connect with qualified professionals from anywhere.',
    productNames: ['General Consultation', 'Annual Physical Exam', 'Dental Cleaning', 'Mental Health Session', 'Pediatric Checkup', 'Dermatology Visit', 'Cardiology Screening', 'Nutrition Counseling', 'Physical Therapy', 'Eye Examination', 'Vaccination Service', 'Lab Testing Package'],
    productDescriptions: ['Comprehensive consultation with a licensed physician', 'Complete health assessment with blood work and screening', 'Professional dental cleaning and oral health evaluation', 'Confidential session with a licensed therapist', 'Age-appropriate health check for children and adolescents', 'Skin health evaluation and treatment planning', 'Heart health screening with ECG and risk assessment', 'Personalized dietary planning and nutritional guidance', 'Rehabilitation and movement therapy for recovery', 'Complete vision test and eye health assessment', 'Up-to-date immunizations for all age groups', 'Comprehensive blood panel and diagnostic testing'],
    categories: ['Primary Care', 'Specialist', 'Dental', 'Mental Health', 'Pediatrics', 'Wellness'],
    metricLabels: ['Patients Seen', 'Appointments', 'Satisfaction', 'Wait Time'],
    metricIcons: ['Heart', 'Calendar', 'ThumbsUp', 'Clock'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '%', ' min'],
    actions: ['booked an appointment', 'completed a checkup', 'received test results', 'updated medical records', 'submitted insurance info', 'left a review'],
    taskVerbs: ['Schedule', 'Review', 'Follow-up', 'Document', 'Prescribe', 'Refer'],
    blogTopics: ['Preventive Health Tips', 'Managing Chronic Conditions', 'Mental Health Awareness', 'Nutrition and Wellness', 'Understanding Lab Results', 'Telehealth Best Practices'],
    blogTags: ['health', 'wellness', 'medical', 'healthcare', 'prevention', 'mental-health', 'nutrition', 'fitness'],
    featureTitles: ['Online Booking', 'Telehealth', 'Medical Records', 'Prescription Management', 'Insurance Verification', 'Health Monitoring'],
    featureDescriptions: ['Book appointments with your preferred doctor in seconds', 'Consult with healthcare providers via secure video calls', 'Access your complete medical history anytime, anywhere', 'Manage prescriptions with automatic refill reminders', 'Instantly verify insurance coverage and benefits', 'Track vital signs and health metrics over time'],
    faqQuestions: ['How do I book an appointment?', 'Is telehealth available?', 'Are my records secure?', 'Which insurance plans are accepted?', 'Can I get prescriptions online?'],
    faqAnswers: ['Select your provider and available time slot directly through our booking system.', 'Yes, we offer secure video consultations for many types of appointments.', 'All records are encrypted and stored in HIPAA-compliant systems.', 'We accept most major insurance plans. Check our insurance page for the full list.', 'Providers can prescribe medications during telehealth consultations when appropriate.'],
    photoIds: ['1576091160399-112ba8d25d1d', '1551190822-a9333d879b1f', '1579684385127-1ef15d508118', '1559757148-5c9c3e067674', '1581056771107-24ca5f033842', '1530497610245-94d3c16cda28'],
    priceRange: [50, 500],
    roles: ['Doctor', 'Nurse', 'Therapist', 'Receptionist', 'Specialist'],
  },
  travel: {
    label: 'Travel',
    itemSingular: 'Destination',
    itemPlural: 'Destinations',
    taglineTemplate: 'Explore the world with unforgettable experiences',
    aboutTemplate: '{appName} helps you discover breathtaking destinations, plan perfect itineraries, and book amazing trips with confidence and ease.',
    productNames: ['Tropical Beach Getaway', 'European City Tour', 'Mountain Adventure Trek', 'Safari Wildlife Experience', 'Mediterranean Cruise', 'Japanese Cultural Journey', 'Caribbean Island Hop', 'Northern Lights Expedition', 'South American Explorer', 'Southeast Asia Backpack', 'Luxury Resort Retreat', 'Historic City Discovery'],
    productDescriptions: ['Relax on pristine beaches with crystal-clear waters', 'Explore iconic landmarks and hidden gems across Europe', 'Hike through stunning mountain landscapes and valleys', 'Witness majestic wildlife in their natural habitat', 'Sail the Mediterranean with stops at stunning ports', 'Immerse yourself in ancient traditions and modern Tokyo', 'Island-hop through turquoise waters and white sand beaches', 'Chase the aurora borealis in Scandinavian wilderness', 'Discover diverse cultures from Patagonia to the Amazon', 'Budget-friendly exploration of temples, markets, and beaches', 'Unwind at a world-class resort with spa and dining', 'Walk through centuries of history in captivating cities'],
    categories: ['Beach', 'Adventure', 'Cultural', 'Luxury', 'Budget', 'Cruise'],
    metricLabels: ['Trips Booked', 'Destinations', 'Travelers', 'Avg Rating'],
    metricIcons: ['Plane', 'MapPin', 'Users', 'Star'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '', '/5'],
    actions: ['booked a trip', 'left a destination review', 'saved to wishlist', 'shared an itinerary', 'uploaded travel photos', 'completed a trip'],
    taskVerbs: ['Book', 'Plan', 'Research', 'Pack', 'Confirm', 'Review'],
    blogTopics: ['Budget Travel Tips', 'Hidden Gem Destinations', 'Packing Essentials Guide', 'Solo Travel Safety', 'Cultural Etiquette Abroad', 'Best Travel Apps'],
    blogTags: ['travel', 'adventure', 'destinations', 'vacation', 'culture', 'explore', 'tips', 'photography'],
    featureTitles: ['Trip Planning', 'Destination Search', 'Booking Engine', 'Travel Guides', 'Budget Tracker', 'Photo Journal'],
    featureDescriptions: ['Build detailed itineraries with maps and schedules', 'Discover destinations that match your interests and budget', 'Book flights, hotels, and activities in one place', 'Read expert guides for every destination we cover', 'Track your travel spending and stay within budget', 'Document your adventures with a beautiful photo journal'],
    faqQuestions: ['Can I customize my itinerary?', 'Is travel insurance included?', 'How do I get the best deals?', 'Can I cancel my booking?', 'Do you offer group discounts?'],
    faqAnswers: ['Yes, every itinerary is fully customizable to fit your preferences.', 'Travel insurance can be added during booking for comprehensive coverage.', 'Enable price alerts and book during our seasonal sales for the best rates.', 'Free cancellation is available up to 48 hours before your trip start date.', 'Groups of 6 or more receive 15% off all bookings automatically.'],
    photoIds: ['1507525428034-b723cf961d3e', '1476514525535-07fb3b4ae5f1', '1530789253388-582c481c54b0', '1502920917128-1aa500764cbd', '1469854523086-cc02fe5d8800', '1500835556837-99ac94a94552'],
    priceRange: [299, 5999],
    roles: ['Travel Agent', 'Tour Guide', 'Concierge', 'Photographer', 'Traveler'],
  },
  petcare: {
    label: 'Pet Care',
    itemSingular: 'Pet',
    itemPlural: 'Pets',
    taglineTemplate: 'Happy pets, happy families — caring made simple',
    aboutTemplate: '{appName} helps pet owners manage their furry friends\' health, appointments, and daily care with easy-to-use tools and expert resources.',
    productNames: ['Annual Wellness Checkup', 'Grooming Spa Package', 'Puppy Training Course', 'Dental Cleaning Service', 'Premium Pet Food Bundle', 'Pet Sitting Service', 'Behavioral Consultation', 'Microchip Registration', 'Vaccination Package', 'Senior Pet Care Plan', 'Emergency First Aid Kit', 'Pet Photography Session'],
    productDescriptions: ['Comprehensive health exam with vaccinations and blood work', 'Full grooming with bath, haircut, nail trim, and ear cleaning', 'Structured 8-week puppy obedience and socialization program', 'Professional dental scaling and polishing for oral health', 'Month supply of vet-recommended nutrition for your pet', 'Trusted and insured pet sitter for while you are away', 'Expert assessment and training plan for behavioral issues', 'Permanent identification and registration for your pet', 'Complete age-appropriate vaccination schedule', 'Tailored health monitoring for aging pets', 'Essential supplies for pet emergencies at home', 'Professional photoshoot with your beloved pet'],
    categories: ['Health', 'Grooming', 'Training', 'Nutrition', 'Boarding', 'Supplies'],
    metricLabels: ['Pets Registered', 'Appointments', 'Happy Customers', 'Services Available'],
    metricIcons: ['PawPrint', 'Calendar', 'Heart', 'Stethoscope'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '', ''],
    actions: ['scheduled a vet visit', 'updated pet profile', 'booked grooming', 'ordered pet food', 'added a new pet', 'completed a checkup'],
    taskVerbs: ['Schedule', 'Feed', 'Walk', 'Groom', 'Train', 'Monitor'],
    blogTopics: ['New Pet Owner Guide', 'Seasonal Pet Safety', 'Nutrition Tips for Pets', 'Understanding Pet Behavior', 'Exercise Ideas for Dogs', 'Indoor Cat Enrichment'],
    blogTags: ['pets', 'dogs', 'cats', 'health', 'grooming', 'training', 'nutrition', 'veterinary'],
    featureTitles: ['Pet Profiles', 'Health Records', 'Vet Finder', 'Appointment Booking', 'Medication Reminders', 'Activity Tracking'],
    featureDescriptions: ['Create detailed profiles for all your pets in one place', 'Store vaccination records and health history digitally', 'Find trusted veterinarians and specialists near you', 'Book vet appointments and grooming sessions easily', 'Never miss a dose with smart medication reminders', 'Track daily walks, feeding, and activity levels'],
    faqQuestions: ['How do I add my pet?', 'Can I store vaccination records?', 'Is there an emergency vet finder?', 'Can multiple family members access?', 'How do reminders work?'],
    faqAnswers: ['Tap Add Pet and fill in their details, breed, age, and a photo.', 'Yes, upload and store all vaccination and medical records securely.', 'Our vet finder includes 24/7 emergency clinics with real-time availability.', 'Yes, invite family members to share pet profiles and manage care together.', 'Set custom reminders for medications, appointments, and feeding schedules.'],
    photoIds: ['1587300003388-59208cc962cb', '1548199973-03cce0bbc87b', '1450778869180-41d0601e0e68', '1583511655857-d19b40a7a54e', '1537151625747-768eb6cf92b2', '1560807707-8cc77767d783'],
    priceRange: [15, 250],
    roles: ['Veterinarian', 'Groomer', 'Trainer', 'Pet Sitter', 'Owner'],
  },
  inventory: {
    label: 'Inventory',
    itemSingular: 'Item',
    itemPlural: 'Items',
    taglineTemplate: 'Streamline your inventory management with precision',
    aboutTemplate: '{appName} provides powerful inventory tracking, automated reordering, and insightful analytics to keep your warehouse operations running smoothly.',
    productNames: ['Wireless Bluetooth Speaker', 'Ergonomic Office Chair', 'LED Desk Lamp', 'Stainless Steel Water Bottle', 'Portable Power Bank', 'Mechanical Keyboard', 'Noise Canceling Headphones', 'Smart Watch Band', 'USB-C Charging Cable', 'Laptop Stand', 'Webcam HD Pro', 'Desk Organizer Set'],
    productDescriptions: ['High-fidelity sound with 12-hour battery life', 'Adjustable lumbar support with breathable mesh back', 'Touch-controlled brightness with wireless charging base', 'Double-wall insulated for hot and cold beverages', 'Fast-charging 20000mAh with dual USB ports', 'Tactile switches with RGB backlight and wrist rest', 'Active noise cancellation with 30-hour battery', 'Silicone replacement band in multiple colors', 'Durable braided cable with fast data transfer', 'Aluminum adjustable riser for improved ergonomics', 'Full HD 1080p with built-in microphone and light', 'Bamboo organizer with drawers and pen holders'],
    categories: ['Electronics', 'Office', 'Accessories', 'Storage', 'Tools', 'Supplies'],
    metricLabels: ['Total Items', 'Low Stock', 'Orders Pending', 'Revenue'],
    metricIcons: ['Package', 'AlertTriangle', 'Clock', 'DollarSign'],
    metricPrefixes: ['', '', '', '$'],
    metricSuffixes: ['', '', '', ''],
    actions: ['added new stock', 'processed an order', 'flagged low inventory', 'updated pricing', 'completed a shipment', 'ran an audit'],
    taskVerbs: ['Restock', 'Audit', 'Ship', 'Count', 'Order', 'Update'],
    blogTopics: ['Inventory Optimization Techniques', 'Warehouse Layout Best Practices', 'Supply Chain Management', 'Reducing Shrinkage', 'Just-in-Time Inventory', 'Barcode System Setup'],
    blogTags: ['inventory', 'warehouse', 'supply-chain', 'logistics', 'management', 'tracking', 'optimization', 'stock'],
    featureTitles: ['Stock Tracking', 'Auto Reorder', 'Barcode Scanning', 'Supplier Management', 'Reports & Analytics', 'Multi-Location'],
    featureDescriptions: ['Real-time visibility into stock levels across all locations', 'Set reorder points and automate purchase orders', 'Scan barcodes for instant item lookup and updates', 'Manage supplier contacts, pricing, and lead times', 'Generate detailed inventory reports and trend analysis', 'Track inventory across multiple warehouses and stores'],
    faqQuestions: ['How does auto-reorder work?', 'Can I scan barcodes?', 'Does it support multiple warehouses?', 'Can I import existing inventory?', 'Is there an API available?'],
    faqAnswers: ['Set minimum stock levels per item and the system automatically creates purchase orders.', 'Yes, use our mobile app or compatible scanner for instant barcode and QR code lookups.', 'Absolutely, manage unlimited locations with inter-warehouse transfer tracking.', 'Import via CSV or Excel file with our guided import wizard.', 'Full REST API is available for integration with your existing systems.'],
    photoIds: ['1553413077-190dd305871c', '1586528116311-ad8dd3c8310d', '1566576912321-d58ddd7a6088', '1590247813693-5541d1c609fd', '1560472354-b33ff0c44a43', '1565688534245-05d6b5be184a'],
    priceRange: [5, 499],
    roles: ['Warehouse Manager', 'Stock Clerk', 'Purchaser', 'Supervisor', 'Analyst'],
  },
  music: {
    label: 'Music',
    itemSingular: 'Track',
    itemPlural: 'Tracks',
    taglineTemplate: 'Your soundtrack, your way — discover and stream',
    aboutTemplate: '{appName} is your ultimate music companion. Discover new artists, create playlists, and enjoy high-quality streaming tailored to your taste.',
    productNames: ['Midnight Serenade', 'Electric Dreams', 'Acoustic Sunrise', 'Bass Drop Revolution', 'Jazz Cafe Sessions', 'Classical Reflections', 'Indie Wanderlust', 'Hip Hop Essentials', 'Electronic Pulse', 'Soul Kitchen Grooves', 'Rock Anthem Collection', 'Lo-Fi Study Beats'],
    productDescriptions: ['Smooth late-night melodies for winding down', 'High-energy electronic tracks for your next adventure', 'Gentle acoustic arrangements to start your morning', 'Deep bass-heavy tracks that shake the room', 'Relaxed jazz instrumentals for coffee shop vibes', 'Timeless classical compositions beautifully remastered', 'Eclectic indie tracks from emerging artists worldwide', 'The freshest beats and bars from top hip-hop artists', 'Pulsating electronic music for the dancefloor', 'Soulful grooves and R&B classics reimagined', 'Guitar-driven anthems for stadium-sized energy', 'Chill instrumental beats for focused study sessions'],
    categories: ['Pop', 'Rock', 'Jazz', 'Electronic', 'Hip Hop', 'Classical'],
    metricLabels: ['Total Plays', 'Active Listeners', 'Playlists Created', 'New Releases'],
    metricIcons: ['Music', 'Headphones', 'ListMusic', 'Disc'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '', ''],
    actions: ['played a track', 'created a playlist', 'liked a song', 'followed an artist', 'shared a playlist', 'discovered new music'],
    taskVerbs: ['Listen', 'Create', 'Share', 'Discover', 'Download', 'Rate'],
    blogTopics: ['Emerging Artists Spotlight', 'Music Production Tips', 'Genre Deep Dives', 'Concert Reviews', 'Vinyl vs Digital Debate', 'Building the Perfect Playlist'],
    blogTags: ['music', 'artists', 'playlists', 'streaming', 'concerts', 'genres', 'production', 'audio'],
    featureTitles: ['Smart Playlists', 'High-Quality Audio', 'Artist Discovery', 'Offline Mode', 'Social Sharing', 'Lyrics Display'],
    featureDescriptions: ['Auto-generated playlists based on your listening habits', 'Stream in lossless quality for the best audio experience', 'Discover new artists tailored to your musical taste', 'Download tracks and playlists for offline listening', 'Share your favorite music with friends and followers', 'Follow along with synchronized lyrics in real-time'],
    faqQuestions: ['What audio quality is available?', 'Can I download for offline?', 'How does discovery work?', 'Is there a family plan?', 'Can I upload my own music?'],
    faqAnswers: ['We offer standard, high, and lossless quality up to 24-bit/192kHz.', 'Yes, download unlimited tracks and playlists for offline enjoyment.', 'Our algorithm analyzes your listening patterns to suggest new artists and tracks.', 'Yes, our family plan supports up to 6 accounts with individual preferences.', 'Artists can upload through our creator portal for global distribution.'],
    photoIds: ['1511379938547-c1f69419868d', '1514320291840-2e0a9bf2a9ae', '1493225457124-a3eb161ffa5f', '1470225620780-dba8ba36b745', '1459749411175-04bf5292ceea', '1507838153847-ad0e952cffb5'],
    priceRange: [1, 15],
    roles: ['Artist', 'Producer', 'DJ', 'Curator', 'Listener'],
  },
  hr: {
    label: 'Human Resources',
    itemSingular: 'Employee',
    itemPlural: 'Employees',
    taglineTemplate: 'Empowering teams with modern HR solutions',
    aboutTemplate: '{appName} streamlines human resources management from recruitment to retirement. Manage your workforce efficiently with intuitive tools for every HR need.',
    productNames: ['Employee Onboarding Suite', 'Performance Review System', 'Payroll Processing', 'Benefits Administration', 'Time and Attendance', 'Recruitment Pipeline', 'Training Management', 'Leave Management Portal', 'Employee Self-Service', 'Compliance Tracker', 'Engagement Surveys', 'Succession Planning'],
    productDescriptions: ['Streamlined onboarding with digital document signing and task tracking', 'Structured review cycles with 360-degree feedback and goal tracking', 'Automated payroll calculation with tax compliance and direct deposit', 'Manage health, dental, vision, and retirement benefits centrally', 'Track hours, overtime, and PTO with automated approval workflows', 'End-to-end applicant tracking from posting to hire', 'Plan and track employee development and certifications', 'Self-service portal for leave requests with calendar integration', 'Employees manage personal info, payslips, and benefits online', 'Stay compliant with labor laws and automated reporting', 'Measure employee satisfaction with customizable pulse surveys', 'Identify and develop future leaders within your organization'],
    categories: ['Recruitment', 'Payroll', 'Benefits', 'Performance', 'Training', 'Compliance'],
    metricLabels: ['Total Employees', 'Open Positions', 'Satisfaction', 'Turnover Rate'],
    metricIcons: ['Users', 'Briefcase', 'ThumbsUp', 'TrendingDown'],
    metricPrefixes: ['', '', '', ''],
    metricSuffixes: ['', '', '%', '%'],
    actions: ['submitted a leave request', 'completed onboarding', 'filed an expense report', 'updated their profile', 'completed training', 'gave peer feedback'],
    taskVerbs: ['Review', 'Approve', 'Onboard', 'Interview', 'Evaluate', 'Schedule'],
    blogTopics: ['Remote Work Best Practices', 'Employee Engagement Strategies', 'Diversity and Inclusion', 'HR Technology Trends', 'Building Company Culture', 'Talent Retention Methods'],
    blogTags: ['hr', 'recruitment', 'management', 'culture', 'workplace', 'employee', 'leadership', 'training'],
    featureTitles: ['People Directory', 'Leave Management', 'Performance Reviews', 'Payroll Integration', 'Recruitment', 'Analytics Dashboard'],
    featureDescriptions: ['Centralized employee directory with org chart visualization', 'Manage PTO, sick days, and leave requests with one-click approval', 'Run structured review cycles with customizable evaluation criteria', 'Seamless integration with payroll providers for accurate processing', 'Track candidates through every stage of your hiring pipeline', 'Workforce analytics with headcount, turnover, and diversity metrics'],
    faqQuestions: ['How does leave approval work?', 'Can employees update their own info?', 'Is payroll integration available?', 'How secure is employee data?', 'Can we customize review templates?'],
    faqAnswers: ['Employees submit requests through the portal; managers approve with one click via email or app.', 'Yes, employees can update personal details, emergency contacts, and bank information.', 'We integrate with major payroll providers including ADP, Gusto, and Paychex.', 'All data is encrypted at rest and in transit with role-based access controls.', 'Fully customizable templates with custom questions, rating scales, and competency frameworks.'],
    photoIds: ['1521737711867-e3b97375f902', '1552664730-d307ca884978', '1542744173-8e7e53415bb0', '1573497019940-1c28c88b4f3e', '1600880292203-757bb62b4baf', '1519389950473-47ba0277781c'],
    priceRange: [0, 99],
    roles: ['HR Manager', 'Recruiter', 'HR Specialist', 'Director', 'Coordinator'],
  },
};

const GENERIC_CONFIG: DomainConfig = {
  label: 'Business',
  itemSingular: 'Item',
  itemPlural: 'Items',
  taglineTemplate: 'Powerful tools for modern teams',
  aboutTemplate: '{appName} provides an intuitive platform to manage your workflow, track progress, and collaborate effectively with your team.',
  productNames: ['Starter Package', 'Professional Suite', 'Enterprise Solution', 'Premium Service', 'Basic Plan', 'Advanced Toolkit', 'Standard Bundle', 'Custom Package', 'Growth Plan', 'Essential Kit', 'Deluxe Edition', 'Ultimate Collection'],
  productDescriptions: ['Get started quickly with core features and basic support', 'Advanced features and priority support for growing teams', 'Full-featured solution with dedicated account management', 'Premium tier with all features and white-glove service', 'Affordable option for individuals and small teams', 'Extended capabilities for power users and developers', 'Well-rounded package for most business needs', 'Tailored solution built for your specific requirements', 'Scalable plan that grows with your business', 'Everything you need to get up and running', 'Enhanced experience with exclusive features', 'Complete package with every feature unlocked'],
  categories: ['Featured', 'Popular', 'New', 'Recommended', 'Sale', 'Premium'],
  metricLabels: ['Total Users', 'Active Sessions', 'Revenue', 'Growth'],
  metricIcons: ['Users', 'Activity', 'DollarSign', 'TrendingUp'],
  metricPrefixes: ['', '', '$', ''],
  metricSuffixes: ['', '', '', '%'],
  actions: ['signed up', 'completed a task', 'left feedback', 'updated settings', 'shared a resource', 'invited a teammate'],
  taskVerbs: ['Complete', 'Review', 'Update', 'Create', 'Assign', 'Archive'],
  blogTopics: ['Getting Started Guide', 'Best Practices', 'Feature Spotlight', 'Customer Success Story', 'Industry Trends', 'Tips and Tricks'],
  blogTags: ['productivity', 'business', 'tools', 'workflow', 'collaboration', 'management', 'tips', 'updates'],
  featureTitles: ['Easy Setup', 'Real-time Sync', 'Team Collaboration', 'Custom Reports', 'Secure Storage', 'Mobile Access'],
  featureDescriptions: ['Get started in minutes with guided onboarding and templates', 'Changes sync instantly across all devices and team members', 'Work together with shared spaces and real-time editing', 'Build custom reports with drag-and-drop simplicity', 'Your data is protected with enterprise-grade encryption', 'Full-featured mobile experience for work on the go'],
  faqQuestions: ['How do I get started?', 'Is there a free plan?', 'How secure is my data?', 'Can I invite my team?', 'What support is available?'],
  faqAnswers: ['Sign up and follow our quick-start guide to be up and running in minutes.', 'Yes, our free tier includes all essential features with generous limits.', 'We use AES-256 encryption and SOC 2 Type II certified infrastructure.', 'Invite unlimited team members with customizable roles and permissions.', 'We offer email, chat, and phone support with premium plans including dedicated managers.'],
  photoIds: ['1497366216548-37526070297c', '1497215728101-856f4ea42174', '1460925895917-afdab827c52f', '1522071820081-009f0129c71c', '1504384308090-c894fdcc538d', '1551434678-e076c223a692'],
  priceRange: [10, 199],
  roles: ['Manager', 'Developer', 'Designer', 'Analyst', 'Coordinator'],
};

const DOMAIN_DETECT_PATTERNS: [RegExp, string][] = [
  [/\b(gym|workout|exercise|fitness|training|muscle|cardio|yoga|crossfit|weight)/i, 'fitness'],
  [/\b(restaurant|food|menu|dine|dining|cafe|baker|pizza|burger|sushi|kitchen|chef|cook|meal|catering)/i, 'restaurant'],
  [/\b(recipe|cooking|ingredient|baking|dish|cuisine)/i, 'recipe'],
  [/\b(money|expense|budget|finance|financial|bank|invest|saving|income|spending|accounting|wallet|payment|invoice|bill)/i, 'finance'],
  [/\b(real\s*estate|property|house|apartment|rent|lease|tenant|landlord|listing|bedroom|condo)/i, 'realestate'],
  [/\b(school|education|course|learn|student|teacher|class|lesson|tutor|university|college|academ)/i, 'education'],
  [/\b(health|medical|doctor|patient|clinic|hospital|diagnos|medicine|therapy|wellness|dental)/i, 'healthcare'],
  [/\b(travel|trip|hotel|flight|vacation|destination|tour|resort|airbnb|itinerar)/i, 'travel'],
  [/\b(pet|dog|cat|animal|vet|veterinar|grooming|adoption|shelter|kennel)/i, 'petcare'],
  [/\b(inventor|warehouse|stock|supply|reorder|shipment|logistic|procurement)/i, 'inventory'],
  [/\b(music|song|playlist|album|artist|genre|podcast|audio|stream|radio|band)/i, 'music'],
  [/\b(employee|hr|human\s*resource|staff|department|payroll|hire|recruit|onboard|leave\s*request|worker)/i, 'hr'],
];

function detectDomainFromReq(req: ProjectRequirements, userPrompt?: string): string {
  const searchTexts = [
    req.appName,
    req.appType,
    ...req.features,
    ...req.dataModels.map(m => m.name),
    ...req.dataModels.flatMap(m => m.fields.map(f => f.name)),
    ...req.pages,
    userPrompt || '',
  ].join(' ');

  for (const [pattern, domain] of DOMAIN_DETECT_PATTERNS) {
    if (pattern.test(searchTexts)) return domain;
  }
  return 'generic';
}

function getDomainConfig(domain: string): DomainConfig {
  return DOMAIN_CONFIGS[domain] || GENERIC_CONFIG;
}

function generateAvatar(rng: SeededRNG): string {
  const id = rng.pick(AVATAR_IDS);
  return `https://images.unsplash.com/photo-${id}?w=150&h=150&fit=crop&crop=face`;
}

function generateImage(rng: SeededRNG, config: DomainConfig, width: number = 600, height: number = 400): string {
  const id = rng.pick(config.photoIds);
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop`;
}

function generatePersonName(rng: SeededRNG): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function generateDate(rng: SeededRNG, daysAgo: number = 90): string {
  const now = new Date(2026, 1, 6);
  const offset = rng.int(0, daysAgo);
  const d = new Date(now.getTime() - offset * 86400000);
  return d.toISOString().split('T')[0];
}

function generateTime(rng: SeededRNG): string {
  const units = ['just now', '2 min ago', '5 min ago', '15 min ago', '30 min ago', '1 hour ago', '2 hours ago', '3 hours ago', '5 hours ago', 'yesterday', '2 days ago', '3 days ago'];
  return rng.pick(units);
}

function generateTimestamp(rng: SeededRNG): string {
  const hour = rng.int(8, 22);
  const minute = rng.int(0, 59);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function pluralize(s: string): string {
  if (s.endsWith('s')) return s;
  if (s.endsWith('y') && !s.endsWith('ey') && !s.endsWith('oy') && !s.endsWith('ay')) return s.slice(0, -1) + 'ies';
  return s + 's';
}

function generatePeople(rng: SeededRNG, config: DomainConfig, count: number): Array<{ name: string; avatar: string; role: string }> {
  const result: Array<{ name: string; avatar: string; role: string }> = [];
  for (let i = 0; i < count; i++) {
    result.push({
      name: generatePersonName(rng),
      avatar: generateAvatar(rng),
      role: rng.pick(config.roles),
    });
  }
  return result;
}

function generateProducts(rng: SeededRNG, config: DomainConfig, appName: string, count: number) {
  const products: SynthesizedContent['products'] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name = config.productNames[i % config.productNames.length];
    if (usedNames.has(name)) {
      name = `${appName} ${name}`;
    }
    usedNames.add(name);

    products.push({
      id: i + 1,
      name,
      description: config.productDescriptions[i % config.productDescriptions.length],
      price: rng.float(config.priceRange[0], config.priceRange[1]),
      category: config.categories[i % config.categories.length],
      image: generateImage(rng, config),
      rating: rng.float(3.5, 5.0, 1),
      reviews: rng.int(5, 500),
      inStock: rng.bool(0.85),
    });
  }
  return products;
}

function generateMetrics(rng: SeededRNG, config: DomainConfig): SynthesizedContent['metrics'] {
  return config.metricLabels.map((label, i) => ({
    label,
    value: label.toLowerCase().includes('rate') || label.toLowerCase().includes('satisfaction')
      ? rng.float(60, 99, 1)
      : label.toLowerCase().includes('avg')
        ? rng.float(50, 200, 1)
        : rng.int(100, 50000),
    change: rng.float(-15, 25, 1),
    prefix: config.metricPrefixes[i] || '',
    suffix: config.metricSuffixes[i] || '',
    icon: config.metricIcons[i] || 'Activity',
  }));
}

function generateRecentActivity(rng: SeededRNG, config: DomainConfig, people: Array<{ name: string; avatar: string }>, count: number): SynthesizedContent['recentActivity'] {
  const result: SynthesizedContent['recentActivity'] = [];
  for (let i = 0; i < count; i++) {
    const person = people[i % people.length];
    result.push({
      id: i + 1,
      user: person.name,
      action: rng.pick(config.actions),
      amount: rng.bool(0.6) ? rng.float(config.priceRange[0], config.priceRange[1]) : null,
      time: generateTime(rng),
      avatar: person.avatar,
    });
  }
  return result;
}

function generateChartData(rng: SeededRNG): SynthesizedContent['chartData'] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(name => ({
    name,
    revenue: rng.int(10000, 80000),
    users: rng.int(200, 5000),
  }));
}

function generateTopItems(rng: SeededRNG, config: DomainConfig, count: number): SynthesizedContent['topItems'] {
  const trends = ['up', 'down', 'stable'];
  return config.productNames.slice(0, count).map(name => ({
    name,
    sales: rng.int(50, 2000),
    revenue: rng.int(1000, 100000),
    trend: rng.pick(trends),
  }));
}

function generateTasks(rng: SeededRNG, config: DomainConfig, people: Array<{ name: string }>, count: number): SynthesizedContent['tasks'] {
  const statuses = ['todo', 'in-progress', 'review', 'done'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const result: SynthesizedContent['tasks'] = [];

  for (let i = 0; i < count; i++) {
    const verb = rng.pick(config.taskVerbs);
    const noun = rng.pick(config.productNames);
    result.push({
      id: i + 1,
      title: `${verb} ${noun}`,
      description: `${verb} the ${noun.toLowerCase()} as part of the current sprint objectives`,
      status: rng.pick(statuses),
      priority: rng.pick(priorities),
      dueDate: generateDate(rng, 30),
      assignee: people[i % people.length].name,
    });
  }
  return result;
}

function generatePosts(rng: SeededRNG, config: DomainConfig, appName: string, people: Array<{ name: string; avatar: string }>, count: number): SynthesizedContent['posts'] {
  const result: SynthesizedContent['posts'] = [];
  for (let i = 0; i < count; i++) {
    const topic = config.blogTopics[i % config.blogTopics.length];
    const author = people[i % people.length];
    const tags = rng.pickN(config.blogTags, rng.int(2, 4));
    const readMinutes = rng.int(3, 15);

    result.push({
      id: i + 1,
      title: topic,
      excerpt: `Explore ${topic.toLowerCase()} with expert insights and actionable advice from the ${appName} team.`,
      content: `In this comprehensive guide, we dive deep into ${topic.toLowerCase()}. Whether you are just getting started or looking to refine your approach, this article covers everything you need to know. From foundational concepts to advanced strategies, the ${appName} team has compiled the most relevant information to help you succeed. Read on to discover practical tips, real-world examples, and data-backed recommendations that will transform how you think about ${topic.toLowerCase()}.`,
      author: author.name,
      authorAvatar: author.avatar,
      date: generateDate(rng, 180),
      category: rng.pick(config.categories),
      readTime: `${readMinutes} min read`,
      image: generateImage(rng, config, 800, 450),
      tags,
    });
  }
  return result;
}

function generatePortfolioProjects(rng: SeededRNG, config: DomainConfig, count: number): SynthesizedContent['portfolioProjects'] {
  const techTags = ['React', 'TypeScript', 'Node.js', 'Python', 'GraphQL', 'PostgreSQL', 'Docker', 'AWS', 'Tailwind CSS', 'Next.js', 'Vue.js', 'MongoDB', 'Redis', 'Figma'];
  const result: SynthesizedContent['portfolioProjects'] = [];

  for (let i = 0; i < count; i++) {
    const name = config.productNames[i % config.productNames.length];
    result.push({
      id: i + 1,
      title: name,
      description: config.productDescriptions[i % config.productDescriptions.length],
      image: generateImage(rng, config, 800, 600),
      tags: rng.pickN(techTags, rng.int(2, 5)),
      link: `https://${name.toLowerCase().replace(/\s+/g, '-')}.example.com`,
      github: `https://github.com/username/${name.toLowerCase().replace(/\s+/g, '-')}`,
    });
  }
  return result;
}

function generateLandingFeatures(rng: SeededRNG, config: DomainConfig): SynthesizedContent['landingFeatures'] {
  const icons = ['Zap', 'Shield', 'Layers', 'RefreshCw', 'Globe', 'Lock', 'BarChart', 'Smartphone'];
  return config.featureTitles.map((title, i) => ({
    icon: icons[i % icons.length],
    title,
    description: config.featureDescriptions[i % config.featureDescriptions.length],
  }));
}

function generatePricingPlans(rng: SeededRNG, config: DomainConfig, appName: string): SynthesizedContent['pricingPlans'] {
  const basePrice = rng.int(9, 29);
  return [
    {
      name: 'Free',
      price: 0,
      period: 'month',
      features: [
        `Basic ${config.label.toLowerCase()} features`,
        'Up to 3 projects',
        'Community support',
        `${appName} branding`,
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Pro',
      price: basePrice,
      period: 'month',
      features: [
        `All ${config.label.toLowerCase()} features`,
        'Unlimited projects',
        'Priority support',
        'No branding',
        'Advanced analytics',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: basePrice * 4,
      period: 'month',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated account manager',
        'SSO & SAML',
        'SLA guarantee',
        'Custom training',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];
}

function generateFaqs(config: DomainConfig): SynthesizedContent['faqs'] {
  return config.faqQuestions.map((q, i) => ({
    q,
    a: config.faqAnswers[i % config.faqAnswers.length],
  }));
}

function generateChatContacts(rng: SeededRNG, config: DomainConfig, people: Array<{ name: string; avatar: string }>, count: number): SynthesizedContent['chatContacts'] {
  const messages = [
    'Hey, are you available for a quick call?',
    'Just sent over the latest updates!',
    'Can you review the draft when you get a chance?',
    'Meeting rescheduled to 3 PM tomorrow.',
    'Great work on the presentation!',
    'Do you have the final numbers?',
    'Let me know when you are free.',
    'Sounds good, I will follow up later.',
    'Thanks for the quick turnaround!',
    'I have a few questions about the project.',
  ];

  return people.slice(0, count).map((person, i) => ({
    id: i + 1,
    name: person.name,
    lastMessage: rng.pick(messages),
    timestamp: generateTimestamp(rng),
    avatar: person.avatar,
    online: rng.bool(0.4),
    unread: rng.bool(0.3) ? rng.int(1, 12) : 0,
  }));
}

function generateChatMessages(rng: SeededRNG, contacts: SynthesizedContent['chatContacts']): SynthesizedContent['chatMessages'] {
  const conversationStarters: string[][] = [
    [
      'Hi there! How is everything going?',
      'Hey! Things are great, thanks for asking.',
      'Glad to hear it. Did you get a chance to look at the proposal?',
      'Yes, I reviewed it this morning. Looks solid overall.',
      'Any feedback or changes you would suggest?',
      'Maybe we could adjust the timeline slightly. Otherwise it is good to go.',
    ],
    [
      'Quick question about the deliverables.',
      'Sure, what do you need to know?',
      'When is the expected completion date?',
      'We are targeting end of next week for the first milestone.',
      'Perfect, that works with our schedule.',
      'Great, I will send a calendar invite shortly.',
    ],
    [
      'Just wanted to follow up on our earlier discussion.',
      'Right, about the resource allocation?',
      'Yes, exactly. Have we finalized the team assignments?',
      'Almost there. Just waiting on confirmation from two people.',
      'Understood. Let me know once confirmed.',
      'Will do, should have an update by tomorrow.',
    ],
  ];

  const result: SynthesizedContent['chatMessages'] = {};
  contacts.forEach((contact, ci) => {
    const convo = conversationStarters[ci % conversationStarters.length];
    result[contact.id] = convo.map((text, mi) => ({
      id: mi + 1,
      sender: mi % 2 === 0 ? contact.name : 'Me',
      text,
      timestamp: generateTimestamp(rng),
      isMe: mi % 2 !== 0,
    }));
  });
  return result;
}

function generateHero(config: DomainConfig, appName: string): { heroTitle: string; heroSubtitle: string; heroCta: string } {
  return {
    heroTitle: `Welcome to ${appName}`,
    heroSubtitle: config.taglineTemplate,
    heroCta: 'Get Started',
  };
}

function generateAboutText(config: DomainConfig, appName: string): string {
  return config.aboutTemplate.replace(/\{appName\}/g, appName);
}

function generateTagline(config: DomainConfig, appName: string): string {
  return `${appName} — ${config.taglineTemplate}`;
}

function deriveItemLabels(config: DomainConfig, req: ProjectRequirements): { itemSingular: string; itemPlural: string } {
  if (req.dataModels.length > 0) {
    const primaryModel = req.dataModels[0].name;
    const words = primaryModel.replace(/([A-Z])/g, ' $1').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const singular = words.join(' ');
    return { itemSingular: singular, itemPlural: pluralize(singular) };
  }
  return { itemSingular: config.itemSingular, itemPlural: config.itemPlural };
}

export function synthesizeContent(req: ProjectRequirements, userPrompt?: string): SynthesizedContent {
  const rng = new SeededRNG(req.appName + (req.appType || ''));
  const domain = detectDomainFromReq(req, userPrompt);
  const config = getDomainConfig(domain);

  const people = generatePeople(rng, config, 8);
  const products = generateProducts(rng, config, req.appName, 12);
  const metrics = generateMetrics(rng, config);
  const recentActivity = generateRecentActivity(rng, config, people, 8);
  const chartData = generateChartData(rng);
  const topItems = generateTopItems(rng, config, 5);
  const tasks = generateTasks(rng, config, people, 8);
  const posts = generatePosts(rng, config, req.appName, people, 6);
  const portfolioProjects = generatePortfolioProjects(rng, config, 6);
  const landingFeatures = generateLandingFeatures(rng, config);
  const pricingPlans = generatePricingPlans(rng, config, req.appName);
  const faqs = generateFaqs(config);
  const chatContacts = generateChatContacts(rng, config, people, 6);
  const chatMessages = generateChatMessages(rng, chatContacts);
  const hero = generateHero(config, req.appName);
  const { itemSingular, itemPlural } = deriveItemLabels(config, req);

  return {
    products,
    productCategories: [...config.categories],
    metrics,
    recentActivity,
    chartData,
    topItems,
    tasks,
    posts,
    blogCategories: [...config.categories],
    portfolioProjects,
    landingFeatures,
    pricingPlans,
    faqs,
    heroTitle: hero.heroTitle,
    heroSubtitle: hero.heroSubtitle,
    heroCta: hero.heroCta,
    chatContacts,
    chatMessages,
    people,
    domainLabel: config.label,
    itemSingular,
    itemPlural,
    tagline: generateTagline(config, req.appName),
    aboutText: generateAboutText(config, req.appName),
  };
}