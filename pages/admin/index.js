import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import OnboardingOverlay from '../../components/OnboardingOverlay';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  RadialBarChart, RadialBar, Legend, ComposedChart
} from 'recharts';

// Animated counter hook
const useAnimatedCounter = (end, duration = 2000, decimals = 0) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      countRef.current = end * progress;
      setCount(Number(countRef.current.toFixed(decimals)));
      
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [end, duration, decimals]);

  return count;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    pages: 0, 
    blogPosts: 0, 
    subscribers: 0,
    plans: 0,
    revenue: 0,
    orders: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    visitors: 0,
    bounceRate: 0,
    sessionDuration: 0
  });
  const [displayStats, setDisplayStats] = useState(stats);
  const [realtimeData, setRealtimeData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    pageViews: [],
    userSessions: [],
    topPages: [],
    deviceStats: [],
    geographicData: []
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const router = useRouter();

  // Animated counters for main stats
  const animatedRevenue = useAnimatedCounter(stats.revenue, 1500, 0);
  const animatedOrders = useAnimatedCounter(stats.orders, 1200, 0);
  const animatedSessions = useAnimatedCounter(stats.visitors, 1800, 0);
  const animatedConversion = useAnimatedCounter(stats.conversionRate, 2000, 1);
  const animatedAOV = useAnimatedCounter(stats.avgOrderValue, 1600, 0);
  const animatedSubscribers = useAnimatedCounter(stats.subscribers, 2200, 0);

  // Generate minimal demo data since no analytics are configured yet
  const generateRealtimeData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
        visitors: 0,
        sessions: 0,
        conversionRate: 0,
        bounceRate: 0,
        pageViews: 0,
        newUsers: 0,
        returningUsers: 0
      });
    }
    return data;
  };

  const generateHourlyData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now - i * 60 * 60 * 1000);
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        hour: time.getHours(),
        activeUsers: 0,
        pageViews: 0,
        revenue: 0,
        orders: 0
      });
    }
    return data;
  };

  const revenueData = generateRealtimeData();
  const hourlyData = generateHourlyData();

  const subscribersData = [
    { name: 'No Subscribers Yet', value: 100, color: '#8a8a8a', count: 0, growth: '0%' }
  ];

  const deviceData = [
    { name: 'No Traffic Yet', value: 100, fill: '#8a8a8a', count: 0, trend: '0%' }
  ];

  const performanceMetrics = [
    { name: 'Response Time', value: 0, unit: 'ms', target: 200, color: '#8a8a8a', status: 'no-data' },
    { name: 'Uptime', value: 0, unit: '%', target: 99.5, color: '#8a8a8a', status: 'no-data' }
  ];

  const performanceData = [];

  const topPagesData = [];

  const trafficSourcesData = [];

  const salesFunnelData = [
    { stage: 'No Data Available', count: 0, percentage: 0 }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      await fetchRealStats();
      checkOnboardingStatus();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealStats = async () => {
    try {
      const [pagesRes, blogRes, subscribersRes, plansRes] = await Promise.all([
        fetch('/api/pages').catch(() => ({ ok: false })),
        fetch('/api/blog').catch(() => ({ ok: false })),
        fetch('/api/subscribers').catch(() => ({ ok: false })),
        fetch('/api/plans').catch(() => ({ ok: false }))
      ]);
      
      const pages = pagesRes.ok ? await pagesRes.json() : [];
      const blog = blogRes.ok ? await blogRes.json() : [];
      const subscribers = subscribersRes.ok ? await subscribersRes.json() : [];
      const plans = plansRes.ok ? await plansRes.json() : [];
      
      // Use real data from API calls
      setStats({
        pages: Array.isArray(pages) ? pages.length : 0,
        blogPosts: Array.isArray(blog) ? blog.length : 0,
        subscribers: Array.isArray(subscribers) ? subscribers.length : 0,
        plans: Array.isArray(plans) ? plans.length : 0,
        revenue: 0,
        orders: 0,
        visitors: 0,
        conversionRate: 0,
        avgOrderValue: 0,
        bounceRate: 0,
        sessionDuration: 0
      });
      
      // Update realtime data
      setRealtimeData(generateRealtimeData());
      
    } catch (error) {
      console.error('Failed to fetch real stats:', error);
      setStats({ 
        pages: 0, blogPosts: 0, subscribers: 0, plans: 0,
        revenue: 0, orders: 0, visitors: 0, conversionRate: 0, 
        avgOrderValue: 0, bounceRate: 0, sessionDuration: 0
      });
      setRealtimeData(generateRealtimeData());
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeData(generateRealtimeData());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkOnboardingStatus = () => {
    const dismissed = localStorage.getItem('onboarding_dismissed');
    const saved = localStorage.getItem('onboarding_progress');
    
    if (dismissed === 'true') {
      setOnboardingDismissed(true);
      setShowOnboarding(false);
      return;
    }
    
    if (saved) {
      const progress = JSON.parse(saved);
      const completed = progress.completedSteps?.length >= 4;
      
      if (completed) {
        setOnboardingDismissed(true);
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } else {
      // First time user - show onboarding overlay
      setShowOnboarding(true);
    }
  };


  if (loading) {
    return (
      <AdminLayout title="Home">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading your dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const shouldShowOnboarding = showOnboarding && !onboardingDismissed;

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingDismissed(true);
  };

  const handleOnboardingDismiss = () => {
    setShowOnboarding(false);
    setOnboardingDismissed(true);
  };

  return (
    <AdminLayout title="Home">
      {/* Onboarding Overlay */}
      {shouldShowOnboarding && (
        <OnboardingOverlay 
          onComplete={handleOnboardingComplete}
          onDismiss={handleOnboardingDismiss}
        />
      )}
      
      <div className={`shopify-dashboard ${shouldShowOnboarding ? 'pointer-events-none opacity-30' : ''}`}>
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Home</h1>
              <p className="text-subdued">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="header-actions">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="timeframe-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
              </select>
            </div>
          </div>
        </div>


        {/* Main Stats Grid */}
        <div className="stats-overview">
          <div className="stats-grid-shopify">
            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total sales</span>
                <div className="stat-menu">
                  <button className="menu-button">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="stat-value">${animatedRevenue.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+12% vs last week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Orders</span>
              </div>
              <div className="stat-value">{animatedOrders.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+8% vs last week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-value">{animatedSessions.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+15% vs last week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Conversion rate</span>
              </div>
              <div className="stat-value">{animatedConversion}%</div>
              <div className="stat-trend negative">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>-2% vs last week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Average order value</span>
              </div>
              <div className="stat-value">${animatedAOV}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+5% vs last week</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Active subscribers</span>
              </div>
              <div className="stat-value">{animatedSubscribers.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+23% vs last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="charts-grid">
            {/* Revenue & Performance Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Revenue & Performance</h3>
                <div className="chart-actions">
                  <button className="btn btn-secondary btn-sm">View report</button>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="revenue"
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="visitors"
                      orientation="right"
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)',
                        boxShadow: 'var(--shadow-popover)'
                      }}
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                        name === 'revenue' ? 'Revenue' : 'Visitors'
                      ]}
                    />
                    <Area 
                      yAxisId="revenue"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--color-primary)" 
                      fillOpacity={1} 
                      fill="url(#revenueGradient)" 
                      strokeWidth={3}
                      animationDuration={2000}
                    />
                    <Line 
                      yAxisId="visitors"
                      type="monotone" 
                      dataKey="visitors" 
                      stroke="var(--color-accent-blue)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-accent-blue)', strokeWidth: 2, r: 3 }}
                      animationDuration={2000}
                      animationDelay={500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Real-time Activity */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Live activity</h3>
                <div className="live-indicator">
                  <div className="live-dot"></div>
                  <span className="text-caption">Live</span>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hourlyData.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="var(--color-text-subdued)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--color-text-subdued)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke="var(--color-primary)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="performance-metrics mt-4">
                  <div className="metrics-grid">
                    {performanceMetrics.slice(0, 2).map((metric, index) => (
                      <div key={index} className="metric-item">
                        <div className="metric-label">{metric.name}</div>
                        <div className="metric-value">
                          {metric.value}{metric.unit}
                          <span className={`metric-status ${metric.status}`}>
                            {metric.status === 'excellent' ? '●' : metric.status === 'good' ? '●' : '●'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Charts Row */}
          <div className="charts-grid mt-6">
            {/* Subscribers Distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Subscribers by plan</h3>
                <div className="chart-actions">
                  <span className="text-caption text-subdued">Last 30 days</span>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={subscribersData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={1500}
                      animationBegin={600}
                    >
                      {subscribersData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="var(--color-surface)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)',
                        boxShadow: 'var(--shadow-popover)'
                      }}
                      formatter={(value, name, props) => [
                        `${value}% (${props.payload.count} users)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="subscriber-legend">
                  {subscribersData.map((entry, index) => (
                    <div key={index} className="subscriber-item">
                      <div className="subscriber-info">
                        <div 
                          className="legend-color" 
                          style={{ backgroundColor: entry.color }}
                        ></div>
                        <div className="subscriber-details">
                          <span className="subscriber-name">{entry.name}</span>
                          <span className="subscriber-stats">
                            {entry.count} users · {entry.value}%
                          </span>
                        </div>
                      </div>
                      <div className="subscriber-growth positive">
                        {entry.growth}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Sales funnel</h3>
              </div>
              <div className="chart-container">
                <div className="space-y-3">
                  {salesFunnelData.map((stage, index) => (
                    <div key={index} className="funnel-stage">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body font-medium">{stage.stage}</span>
                        <div className="text-right">
                          <span className="text-body font-medium">{stage.count.toLocaleString()}</span>
                          <span className="text-caption text-subdued ml-2">({stage.percentage}%)</span>
                        </div>
                      </div>
                      <div 
                        className="progress-container"
                        style={{ 
                          background: `linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary) ${stage.percentage}%, var(--color-border) ${stage.percentage}%, var(--color-border) 100%)`,
                          height: '8px'
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="section-header">
            <h3 className="text-heading">Quick actions</h3>
          </div>
          <div className="actions-grid">
            <button 
              onClick={() => router.push('/admin/plans/new')}
              className="action-card"
            >
              <div className="action-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="action-content">
                <h4>Add plan</h4>
                <p className="text-subdued">Create a new pricing plan</p>
              </div>
            </button>

            <button 
              onClick={() => router.push('/admin/pages/new')}
              className="action-card"
            >
              <div className="action-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="action-content">
                <h4>Create page</h4>
                <p className="text-subdued">Add a new page to your site</p>
              </div>
            </button>

            <button 
              onClick={() => router.push('/admin/blog/new')}
              className="action-card"
            >
              <div className="action-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <div className="action-content">
                <h4>Write blog post</h4>
                <p className="text-subdued">Share your latest updates</p>
              </div>
            </button>

            <button 
              onClick={() => router.push('/admin/analytics')}
              className="action-card"
            >
              <div className="action-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="action-content">
                <h4>View analytics</h4>
                <p className="text-subdued">Detailed reports and insights</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <div className="section-header">
            <h3 className="text-heading">Recent activity</h3>
            <button className="btn btn-secondary btn-sm">View all</button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon success">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="activity-content">
                <p><strong>New subscriber</strong> joined Pro plan</p>
                <span className="text-subdued">2 minutes ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon info">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <div className="activity-content">
                <p><strong>Page updated:</strong> /pricing</p>
                <span className="text-subdued">1 hour ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon warning">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="activity-content">
                <p><strong>API limit reached</strong> for Basic plan users</p>
                <span className="text-subdued">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}