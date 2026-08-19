import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Download, PieChart, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAppStore } from "../store/useAppStore";
import { useGroupsQuery, usePersonalExpensesQuery, useCreatePersonalExpenseMutation, useDeletePersonalExpenseMutation } from "../hooks/useGroupsApi";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { useState } from "react";

export default function FinancePage() {
  const groups = useAppStore((state) => state.groups);
  const { isLoading } = useGroupsQuery();
  const { data: personalExpenses = [], isLoading: loadingPersonal } = usePersonalExpensesQuery();
  const createPersonalExpense = useCreatePersonalExpenseMutation();
  const deletePersonalExpense = useDeletePersonalExpenseMutation();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    category: "food",
    currency: "USD",
  });

  const groupExpenses = Object.values(groups).flatMap((group) => 
    group.expenses.map((expense) => ({ group, expense, type: 'group' as const }))
  );
  
  const totalGroupSpend = groupExpenses.reduce((sum, item) => sum + item.expense.amount, 0);
  const totalPersonalSpend = personalExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
  const totalSpend = totalGroupSpend + totalPersonalSpend;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createPersonalExpense.mutateAsync({
        title: newExpense.title,
        category: newExpense.category as any,
        currency: newExpense.currency,
        amount: parseFloat(newExpense.amount),
        incurredOn: new Date().toISOString(),
      });
      
      setNewExpense({ title: "", amount: "", category: "food", currency: "USD" });
      setShowAddForm(false);
    } catch (error) {
      alert("Failed to add expense");
    }
  };

  const exportAll = () => {
    const allExpenses = [
      ...groupExpenses.map(({ group, expense }) => ({
        type: 'Group',
        group: group.title,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: expense.paidBy,
        incurredOn: expense.incurredOn,
      })),
      ...personalExpenses.map((expense: any) => ({
        type: 'Personal',
        group: '-',
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: 'You',
        incurredOn: expense.incurredOn,
      })),
    ];
    
    const csv = Papa.unparse(allExpenses);
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "travel-finance-ledger.csv");
  };

  return (
    <AppLayout
      title="Finance"
      description="Track personal and group expenses, outstanding balances, and export audit-ready reports."
      actions={
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Add Personal Expense</span><span className="sm:hidden">Add Expense</span>
          </Button>
          <Button onClick={exportAll} variant="secondary" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export all
          </Button>
        </div>
      }
    >
      {/* Add Personal Expense Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Personal Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                  required
                />
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                >
                  <option value="food">Food</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transport">Transport</option>
                  <option value="activities">Activities</option>
                  <option value="gear">Gear</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={newExpense.currency}
                  onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" isLoading={createPersonalExpense.isPending} className="w-full sm:w-auto">Add Expense</Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)} className="w-full sm:w-auto">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Group Expenses</p>
            <p className="text-3xl font-semibold text-slate-900">${totalGroupSpend.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{groupExpenses.length} expenses across {Object.keys(groups).length} groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Personal Expenses</p>
            <p className="text-3xl font-semibold text-slate-900">${totalPersonalSpend.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{personalExpenses.length} personal expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Total Spend</p>
            <p className="text-3xl font-semibold text-primary-600">${totalSpend.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Group + Personal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-slate-600">Total Expenses</p>
            <p className="text-3xl font-semibold text-slate-900">{groupExpenses.length + personalExpenses.length}</p>
            <p className="text-xs text-slate-500">All tracked expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Personal Expenses */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Personal Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Category</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Currency</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPersonal && personalExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        Loading expenses...
                      </td>
                    </tr>
                  )}
                  {!loadingPersonal && personalExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        No personal expenses yet. Add one above!
                      </td>
                    </tr>
                  )}
                  {personalExpenses.map((expense: any) => (
                    <tr key={expense.id}>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium">{expense.title}</div>
                        <div className="sm:hidden text-xs text-slate-500 mt-1">{expense.category} • {expense.currency}</div>
                        <div className="lg:hidden text-xs text-slate-500 mt-1">{format(new Date(expense.incurredOn), "PP")}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{expense.category}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{expense.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{expense.currency}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{format(new Date(expense.incurredOn), "PP")}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this expense?")) {
                              deletePersonalExpense.mutate(expense.id);
                            }
                          }}
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">×</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Expenses */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Group Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Group</th>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Category</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Currency</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && groupExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        Loading expenses...
                      </td>
                    </tr>
                  )}
                  {!isLoading && groupExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                        No group expenses recorded yet.
                      </td>
                    </tr>
                  )}
                  {groupExpenses.map(({ group, expense }) => (
                    <tr key={`group-${expense.id}`}>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium">{group.title}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium">{expense.title}</div>
                        <div className="sm:hidden text-xs text-slate-500 mt-1">{expense.category} • {expense.currency}</div>
                        <div className="lg:hidden text-xs text-slate-500 mt-1">{format(new Date(expense.incurredOn), "PP")}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{expense.category}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{expense.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{expense.currency}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{format(new Date(expense.incurredOn), "PP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
