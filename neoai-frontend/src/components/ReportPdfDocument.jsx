import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 30,
    paddingBottom: 36,
    fontSize: 10,
    color: "#122033",
    fontFamily: "Helvetica"
  },
  title: {
    fontSize: 24,
    color: "#4b7fc0",
    fontWeight: 700,
    marginBottom: 18
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 13,
    color: "#4b7fc0",
    fontWeight: 700,
    marginBottom: 8
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 6
  },
  fieldLabel: {
    width: 180,
    fontWeight: 700
  },
  fieldValue: {
    flex: 1
  },
  checkboxLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  checkboxItem: {
    marginRight: 10,
    marginBottom: 6
  },
  frameBlock: {
    marginBottom: 12,
    width: 535
  },
  frameLabel: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4
  },
  frameImage: {
    width: 535,
    border: "1 solid #d4d8de"
  },
  table: {
    borderWidth: 1,
    borderColor: "#cfd6df",
    borderStyle: "solid"
  },
  tableRow: {
    flexDirection: "row"
  },
  tableHeaderCell: {
    backgroundColor: "#edf2f7",
    fontWeight: 700
  },
  tableCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cfd6df",
    borderStyle: "solid",
    justifyContent: "center"
  },
  lastColumn: {
    borderRightWidth: 0
  },
  lastRow: {
    borderBottomWidth: 0
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  chip: {
    fontSize: 9,
    color: "#26486f",
    borderWidth: 1,
    borderColor: "#a6b9d0",
    borderStyle: "solid",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  inputBlock: {
    borderWidth: 1,
    borderColor: "#cfd6df",
    borderStyle: "solid",
    padding: 10,
    minHeight: 64,
    marginBottom: 10
  },
  inputLabel: {
    fontWeight: 700,
    marginBottom: 6
  },
  approvalNote: {
    marginTop: 12,
    lineHeight: 1.5
  }
});

function renderCell(content, width, isHeader = false, isLastColumn = false, isLastRow = false) {
  return (
    <View
      style={[
        styles.tableCell,
        { width },
        isHeader ? styles.tableHeaderCell : null,
        isLastColumn ? styles.lastColumn : null,
        isLastRow ? styles.lastRow : null
      ]}
    >
      <Text>{content}</Text>
    </View>
  );
}

export function ReportPdfDocument({ reportData }) {
  const {
    title,
    patientFields,
    selectedIndications,
    otherIndication,
    regionRows,
    diagnosisProbabilities,
    totalScore,
    overallSeverityLabel,
    highlightedRegions,
    finalDiagnosis,
    treatmentRecommendation,
    followUpRecommendation,
    signedBy
  } = reportData;

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Patient Information</Text>
          {patientFields.map((field) => (
            <View key={field.label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Clinical Indication</Text>
          <View style={styles.checkboxLine}>
            {selectedIndications.map((item) => (
              <Text key={item.label} style={styles.checkboxItem}>
                [{item.checked ? "x" : " "}] {item.label}
              </Text>
            ))}
            <Text style={styles.checkboxItem}>
              [{otherIndication?.checked ? "x" : " "}] Other: {otherIndication?.value || "____"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Lung Regions and Images</Text>
          {regionRows.map((row) => (
            <View key={row.region} style={styles.frameBlock} wrap={false}>
              <Text style={styles.frameLabel}>{row.region.toUpperCase()}</Text>
              {row.image ? <Image src={row.image} style={styles.frameImage} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Ultrasound Findings (AI Detection)</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {renderCell("Region", "12%", true)}
              {renderCell("Image Quality", "16%", true)}
              {renderCell("B-Line Count", "14%", true)}
              {renderCell("Pattern", "14%", true)}
              {renderCell("Pleural Line", "14%", true)}
              {renderCell("White Lung", "12%", true)}
              {renderCell("Key Findings", "18%", true, true)}
            </View>
            {regionRows.map((row, index) => (
              <View key={row.region} style={styles.tableRow}>
                {renderCell(row.region.toUpperCase(), "12%", false, false, index === regionRows.length - 1)}
                {renderCell(row.imageQuality, "16%", false, false, index === regionRows.length - 1)}
                {renderCell(String(row.bLineCount), "14%", false, false, index === regionRows.length - 1)}
                {renderCell(row.pattern, "14%", false, false, index === regionRows.length - 1)}
                {renderCell(row.pleuralLine, "14%", false, false, index === regionRows.length - 1)}
                {renderCell(row.whiteLung, "12%", false, false, index === regionRows.length - 1)}
                {renderCell(row.findings.join(", "), "18%", false, true, index === regionRows.length - 1)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. LUS Scoring</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {renderCell("Region", "18%", true)}
              {renderCell("RDS Score", "18%", true)}
              {renderCell("Severity Label", "40%", true)}
              {renderCell("AI Confidence", "24%", true, true)}
            </View>
            {regionRows.map((row, index) => (
              <View key={row.region} style={styles.tableRow}>
                {renderCell(row.region.toUpperCase(), "18%", false, false, index === regionRows.length - 1)}
                {renderCell(String(row.regionScore), "18%", false, false, index === regionRows.length - 1)}
                {renderCell(row.severityLabel, "40%", false, false, index === regionRows.length - 1)}
                {renderCell(row.confidence, "24%", false, true, index === regionRows.length - 1)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. AI Disease Classification</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {renderCell("Diagnosis", "76%", true)}
              {renderCell("Probability", "24%", true, true)}
            </View>
            {diagnosisProbabilities.map((item, index) => (
              <View key={item.label} style={styles.tableRow}>
                {renderCell(item.label, "76%", false, false, index === diagnosisProbabilities.length - 1)}
                {renderCell(item.probability, "24%", false, true, index === diagnosisProbabilities.length - 1)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. AI Clinical Report</Text>
          <Text>Automatic clinical assessment generated by NeoAI LUS Assistant:</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Clinical Assessment (Physician)</Text>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Final Diagnosis</Text>
            <Text>{finalDiagnosis || " "}</Text>
          </View>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Treatment / Recommendation</Text>
            <Text>{treatmentRecommendation || " "}</Text>
          </View>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Follow-up Recommendation</Text>
            <Text>{followUpRecommendation || " "}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Approval</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {renderCell("Role", "34%", true)}
              {renderCell("Name", "33%", true)}
              {renderCell("Signature", "33%", true, true)}
            </View>
            <View style={styles.tableRow}>
              {renderCell("Reporting Physician", "34%", false, false, true)}
              {renderCell(signedBy, "33%", false, false, true)}
              {renderCell("________________", "33%", false, true, true)}
            </View>
          </View>
          <Text style={styles.approvalNote}>
            Note: This report contains AI analysis generated by NeoAI LUS Assistant. Clinical decisions should be made
            based on physician evaluation.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
