export function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Bem-vindo</h2>
          <p className="text-gray-600">Sistema pronto para uso</p>
        </div>
      </div>
    </div>
  );
}
