import { useState } from "react";
import { auditEntries, demoUsers } from "../data/mockData";

const initialForm = {
  fullName: "",
  username: "",
  role: "DOCTOR",
  department: "",
  email: ""
};

export function AdminPanelPage() {
  const [users, setUsers] = useState(demoUsers);
  const [form, setForm] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleCreateUser(event) {
    event.preventDefault();

    setUsers((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        ...form,
        active: true
      }
    ]);

    setForm(initialForm);
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact">
        <div>
          <p className="section-kicker">Admin Panel</p>
          <h2>User management and audit monitoring</h2>
          <p className="page-lead">
            Admin users can do everything a doctor can do, plus create internal users, update access, and review audit
            history.
          </p>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Create user</p>
              <h3>Provision internal accounts</h3>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreateUser}>
            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </label>
            <label>
              Username
              <input name="username" value={form.username} onChange={handleChange} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              Department
              <input name="department" value={form.department} onChange={handleChange} required />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                Create user
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Audit records</p>
              <h3>Recent administrative activity</h3>
            </div>
          </div>

          <div className="audit-list">
            {auditEntries.map((entry) => (
              <div className="audit-item" key={entry.id}>
                <strong>{entry.action}</strong>
                <span>{entry.target}</span>
                <small>
                  {entry.actor} • {entry.timestamp}
                </small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Users</p>
            <h3>Registered internal accounts</h3>
          </div>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.department}</td>
                  <td>{user.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
