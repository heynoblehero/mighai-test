import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LogicPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [logicPage, setLogicPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      loadLogicPage();
    }
  }, [slug]);

  const loadLogicPage = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/logic-pages?slug=${slug}`);
      const data = await res.json();

      if (!data.success || data.logic_pages.length === 0) {
        setError('Logic page not found');
        setLoading(false);
        return;
      }

      const page = data.logic_pages[0];

      // Check if published
      if (page.status !== 'published') {
        setError('This logic page is not available yet');
        setLoading(false);
        return;
      }

      // Check if frontend is configured
      if (!page.frontend_html) {
        setError('This logic page is not properly configured');
        setLoading(false);
        return;
      }

      setLogicPage(page);
      setLoading(false);
    } catch (error) {
      console.error('Error loading logic page:', error);
      setError('Failed to load logic page');
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !logicPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-white mb-4">{error || 'Page Not Found'}</h1>
          <p className="text-gray-400 mb-8">The logic page you're looking for doesn't exist or is not available.</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Inject the frontend code
  const fullHtmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${logicPage.title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          ${logicPage.frontend_css || ''}
        </style>
      </head>
      <body>
        ${logicPage.frontend_html || ''}

        <script>
          // Ensure the backend route is available globally
          window.BACKEND_ROUTE = '${logicPage.backend_route}';
          window.LOGIC_PAGE_SLUG = '${logicPage.slug}';

          // User's JavaScript
          ${logicPage.frontend_js || ''}
        </script>
      </body>
    </html>
  `;

  return (
    <>
      <Head>
        <title>{logicPage.title}</title>
        <meta name="description" content={logicPage.description} />
      </Head>

      <div className="logic-page-container" style={{ width: '100%', height: '100vh', overflow: 'auto' }}>
        <iframe
          srcDoc={fullHtmlContent}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          title={logicPage.title}
        />
      </div>
    </>
  );
}
