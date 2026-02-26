/**
 * Dashboard page - placeholder until Phase 8.
 */
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Revenue (This Month)</h3>
          <p className="text-3xl font-bold text-[#1E5184] mt-2">Rs. 0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Outstanding Dues</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">Rs. 0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Occupancy</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">0 / 13</p>
          <p className="text-sm text-gray-500">seats filled</p>
        </div>
      </div>
      <p className="text-gray-500 mt-8">Full dashboard will be built in Phase 8.</p>
    </div>
  )
}
