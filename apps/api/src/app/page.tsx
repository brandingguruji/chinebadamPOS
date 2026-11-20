export default function Home() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Chinebadam API Server</h1>
      <p>Running on port 4000. Available endpoints:</p>
      <ul>
        <li>POST /api/auth/login</li>
        <li>GET /api/auth/me</li>
        <li>GET /api/tables</li>
        <li>GET /api/dishes</li>
        <li>GET /api/orders</li>
        <li>GET /api/dashboard/stats</li>
      </ul>
    </div>
  );
}
