import { useState } from "react";
import { Link } from "react-router-dom";
import { findPatientById } from "../services/mockApi";
import { notifyUserError } from "../services/errorToastBus";

export function PatientQueryPage() {
  const [query, setQuery] = useState("PT-1001");
  const [patient, setPatient] = useState(() => findPatientById("PT-1001"));

  function handleSubmit(event) {
    event.preventDefault();
    const found = findPatientById(query);
    setPatient(found);
    if (!found) {
      notifyUserError("No patient was found for this ID.");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact">
        <div>
          <p className="section-kicker">AI Assistant</p>
          <h2>Query ultrasound examinations by patient id</h2>
          <p className="page-lead">
            Doctors can search health data by id, review examination history, and continue to image selection for AI
            diagnosis.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Patient lookup</p>
            <h3>Search patient records</h3>
          </div>
        </div>

        <form className="inline-form" onSubmit={handleSubmit}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter patient id" />
          <button className="primary-button" type="submit">
            Search
          </button>
        </form>
      </section>

      {patient ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Patient data</p>
              <h3>
                {patient.name} • {patient.id}
              </h3>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Examination id</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Videos</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patient.examinations.map((examination) => (
                  <tr key={examination.id}>
                    <td>{examination.id}</td>
                    <td>{examination.date}</td>
                    <td>{examination.status}</td>
                    <td>{examination.videos.length}</td>
                    <td>
                      <Link className="text-link" to={`/workspace/${patient.id}/${examination.id}`}>
                        Open workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h3>No patient found</h3>
          <p>Use the sample ids `PT-1001` or `PT-1002` to explore the workflow.</p>
        </section>
      )}
    </div>
  );
}
