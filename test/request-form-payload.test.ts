import { describe, expect, it } from "vitest";
import { buildDraftPayload } from "@/lib/requests/form";

function formData(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) data.append(key, item);
  }
  return data;
}

describe("spending request form payload", () => {
  it("creates one department allocation equal to the selected request totals", () => {
    const payload = buildDraftPayload(formData({
      title: "Lighting deposit",
      primaryDepartmentId: "40000000-0000-0000-0000-000000000001",
      description: "Deposit for the lighting supplier",
      net: "1000.00",
      vat: "200.00",
      gross: "1200.00",
      vatRate: "20",
      vatTreatment: "standard",
      vatRecoverable: "on",
      componentSequence: "10",
      componentDescription_10: "Full payment",
      componentNet_10: "1000.00",
      componentVat_10: "200.00",
      componentGross_10: "1200.00",
      componentVatRate_10: "20",
      componentVatTreatment_10: "standard",
    }));

    expect(payload.p_allocations).toEqual([
      {
        department_id: "40000000-0000-0000-0000-000000000001",
        net_minor: 100000,
        vat_minor: 20000,
        gross_minor: 120000,
      },
    ]);
    expect(payload.p_components).toMatchObject([
      {
        sequence_number: 1,
        description: "Full payment",
        net_minor: 100000,
        vat_minor: 20000,
        gross_minor: 120000,
      },
    ]);
  });

  it("requires a description", () => {
    expect(() => buildDraftPayload(formData({
      title: "Lighting deposit",
      primaryDepartmentId: "40000000-0000-0000-0000-000000000001",
      description: "",
      net: "1000.00",
      vat: "200.00",
      gross: "1200.00",
      vatTreatment: "standard",
      componentSequence: "1",
      componentDescription_1: "Full payment",
      componentNet_1: "1000.00",
      componentVat_1: "200.00",
      componentGross_1: "1200.00",
    }))).toThrow("Describe what this spending request is for.");
  });

  it("rejects components that do not reconcile with request totals", () => {
    expect(() => buildDraftPayload(formData({
      title: "Lighting deposit",
      primaryDepartmentId: "40000000-0000-0000-0000-000000000001",
      description: "Deposit for the lighting supplier",
      net: "1000.00",
      vat: "200.00",
      gross: "1200.00",
      vatTreatment: "standard",
      componentSequence: ["1", "2"],
      componentDescription_1: "Deposit",
      componentNet_1: "500.00",
      componentVat_1: "100.00",
      componentGross_1: "600.00",
      componentDescription_2: "Balance",
      componentNet_2: "100.00",
      componentVat_2: "20.00",
      componentGross_2: "120.00",
    }))).toThrow("Payment components must reconcile");
  });
});
