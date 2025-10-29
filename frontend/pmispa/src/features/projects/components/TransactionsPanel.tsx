export default function TransactionsPanel({ projectId }: { projectId: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Transactions</h3>
      <div className="text-sm text-gray-600">
        Journal d’événements (à brancher). ProjectId = {projectId}
      </div>
    </div>
  );
}
