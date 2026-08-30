"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  departmentColourForCode,
  missingStandardDepartments,
} from "@/lib/departments/templates";
import { friendlyInvitationError } from "@/lib/invitations/messages";
import { parseInvitationInput } from "@/lib/invitations/parse-invitation-input";
import type { Enums } from "@/src/types/database.generated";

export type FormState = {
  ok: boolean;
  message: string;
};

export type InvitationState = FormState & {
  token?: string;
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(value: string) {
  return value.length > 0 ? value : undefined;
}

function yearValue(value: string) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error("Enter an event year between 2000 and 2200.");
  }
  return year;
}

function codeValue(value: string, label: string) {
  const code = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z][A-Z0-9]{0,9}$/.test(code)) {
    throw new Error(`${label} must start with a letter and use letters or numbers.`);
  }
  return code;
}

function safeMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (message) {
    if (/retain at least one active President|keep at least one president/i.test(message)) {
      return "Every event must have at least one active President. Assign another President before removing this role or changing this member's status.";
    }
    if (/duplicate|already exists|required|invalid|authorised|expiry|expired|pending|email|invitation|read-only|same event|president|department|order/i.test(message)) {
      return message;
    }
  }
  return "The request could not be completed.";
}

function isFrameworkRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function rpcClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?returnTo=/events");
  }

  return supabase;
}

export async function createOrganisationAndEventAction(formData: FormData) {
  const supabase = await rpcClient();
  try {
    const eventYear = yearValue(clean(formData.get("eventYear")));
    const eventCode = codeValue(clean(formData.get("eventCode")), "Event code");
    const organisationName = clean(formData.get("organisationName"));
    const organisationSlug = clean(formData.get("organisationSlug"));
    const eventName = clean(formData.get("eventName"));

    if (!organisationName || !organisationSlug || !eventName) {
      throw new Error("Organisation name, slug and event name are required.");
    }

    const { data, error } = await supabase.rpc("create_organisation_and_event", {
      p_organisation_name: organisationName,
      p_organisation_slug: organisationSlug,
      p_event_name: eventName,
      p_event_code: eventCode,
      p_event_year: eventYear,
      p_event_date: optionalDate(clean(formData.get("eventDate"))),
      p_planning_start_date: optionalDate(clean(formData.get("planningStartDate"))),
      p_legal_name: clean(formData.get("legalName")) || undefined,
      p_initial_status: clean(formData.get("initialStatus")) as Enums<"event_status">,
      p_assign_treasurer: formData.get("assignTreasurer") === "on",
    });

    if (error) {
      throw error;
    }

    const eventId = data?.[0]?.event_id;
    if (!eventId) {
      throw new Error("Event was not returned by setup.");
    }

    revalidatePath("/events");
    redirect(`/events/${eventId}/settings?created=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/new?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function createRecurringEventAction(formData: FormData) {
  const supabase = await rpcClient();
  const organisationId = clean(formData.get("organisationId"));
  try {
    if (!organisationId) {
      throw new Error("Choose an organisation.");
    }
    const { data, error } = await supabase.rpc("create_event_for_organisation", {
      p_organisation_id: organisationId,
      p_event_name: clean(formData.get("eventName")),
      p_event_code: codeValue(clean(formData.get("eventCode")), "Event code"),
      p_event_year: yearValue(clean(formData.get("eventYear"))),
      p_event_date: optionalDate(clean(formData.get("eventDate"))),
      p_planning_start_date: optionalDate(clean(formData.get("planningStartDate"))),
      p_initial_status: clean(formData.get("initialStatus")) as Enums<"event_status">,
    });
    if (error) {
      throw error;
    }
    revalidatePath("/events");
    redirect(`/events/${data}/settings?created=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/new?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function updateEventSettingsAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  try {
    const { error } = await supabase.rpc("update_event_settings", {
      p_event_id: eventId,
      p_name: clean(formData.get("eventName")),
      p_code: codeValue(clean(formData.get("eventCode")), "Event code"),
      p_event_year: yearValue(clean(formData.get("eventYear"))),
      p_event_date: optionalDate(clean(formData.get("eventDate"))),
      p_planning_start_date: optionalDate(clean(formData.get("planningStartDate"))),
    });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function updateEventOrganisationAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  const organisationId = clean(formData.get("organisationId"));
  try {
    if (!organisationId) throw new Error("Choose an organisation.");
    const { error } = await supabase.rpc("update_event_organisation", {
      p_event_id: eventId,
      p_organisation_id: organisationId,
    });
    if (error) throw error;
    revalidatePath("/app");
    revalidatePath(`/events/${eventId}`);
    redirect(`/events/${eventId}/settings?organisationSaved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) throw error;
    redirect(`/events/${eventId}/settings?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function saveDepartmentAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  const departmentId = clean(formData.get("departmentId"));
  try {
    const departmentCode = codeValue(clean(formData.get("code")), "Department code");
    let colour = departmentColourForCode(departmentCode);

    if (departmentId) {
      const { data: existingDepartment, error: departmentError } = await supabase
        .from("departments")
        .select("colour")
        .eq("id", departmentId)
        .maybeSingle();

      if (departmentError) {
        throw departmentError;
      }

      colour = existingDepartment?.colour ?? colour;
    }

    const payload = {
      p_name: clean(formData.get("name")),
      p_code: departmentCode,
      p_colour: colour,
      p_description: clean(formData.get("description")) || undefined,
      p_display_order: 0,
    };
    const { error } = departmentId
      ? await supabase.rpc("update_department", {
          p_department_id: departmentId,
          ...payload,
          p_is_active: formData.get("isActive") !== "off",
        })
      : await supabase.rpc("create_department", {
          p_event_id: eventId,
          ...payload,
        });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/departments`);
    redirect(`/events/${eventId}/departments?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/departments?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function addTemplateDepartmentsAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));

  try {
    const { data: departments, error: departmentsError } = await supabase
      .from("departments")
      .select("code")
      .eq("event_id", eventId);

    if (departmentsError) {
      throw departmentsError;
    }

    const existingCodes = (departments ?? []).map((department) => department.code);
    const missingDepartments = missingStandardDepartments(existingCodes);

    for (const department of missingDepartments) {
      const { error } = await supabase.rpc("create_department", {
        p_event_id: eventId,
        p_name: department.name,
        p_code: department.code,
        p_colour: departmentColourForCode(
          department.code,
          department.displayOrder,
        ),
        p_description: undefined,
        p_display_order: department.displayOrder,
      });

      if (error) {
        throw error;
      }
    }

    revalidatePath(`/events/${eventId}/departments`);
    redirect(
      `/events/${eventId}/departments?templateAdded=${missingDepartments.length}&templateExisting=${existingCodes.length}`,
    );
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/departments?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function issueInvitationAction(
  _previousState: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const supabase = await rpcClient();
  try {
    const eventId = clean(formData.get("eventId"));
    const roles = formData
      .getAll("roles")
      .map(String)
      .filter(Boolean) as Enums<"event_role">[];
    const departments = formData.getAll("departments").map(String).filter(Boolean);
    const { data, error } = await supabase.rpc("issue_invitation", {
      p_event_id: eventId,
      p_email: clean(formData.get("email")),
      p_roles: roles.length ? roles : ["committee_member"],
      p_department_ids: departments,
      p_expires_in_days: Number(clean(formData.get("expiresInDays")) || "14"),
    });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/committee`);
    return {
      ok: true,
      message: "Invitation created. Email delivery is not configured.",
      token: data?.[0]?.invitation_token,
    };
  } catch (error) {
    return { ok: false, message: safeMessage(error) };
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  try {
    const { error } = await supabase.rpc("revoke_invitation", {
      p_invitation_id: clean(formData.get("invitationId")),
    });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/committee`);
    redirect(`/events/${eventId}/committee?revoked=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/committee?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function updateRoleAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  const eventMemberId = clean(formData.get("eventMemberId"));
  const role = clean(formData.get("role")) as Enums<"event_role">;
  const intent = clean(formData.get("intent"));
  try {
    const { error } =
      intent === "remove"
        ? await supabase.rpc("remove_event_role", {
            p_event_member_id: eventMemberId,
            p_role: role,
          })
        : await supabase.rpc("assign_event_role", {
            p_event_member_id: eventMemberId,
            p_role: role,
          });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/committee`);
    redirect(`/events/${eventId}/committee?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/committee?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function updateDepartmentMembershipAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  const eventMemberId = clean(formData.get("eventMemberId"));
  const departmentId = clean(formData.get("departmentId"));
  const intent = clean(formData.get("intent"));
  try {
    const { error } =
      intent === "remove"
        ? await supabase.rpc("remove_department_member", {
            p_event_member_id: eventMemberId,
            p_department_id: departmentId,
          })
        : await supabase.rpc("assign_department_member", {
            p_event_member_id: eventMemberId,
            p_department_id: departmentId,
          });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/committee`);
    redirect(`/events/${eventId}/committee?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/committee?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function updateMemberStatusAction(formData: FormData) {
  const supabase = await rpcClient();
  const eventId = clean(formData.get("eventId"));
  try {
    const { error } = await supabase.rpc("update_event_member_status", {
      p_event_member_id: clean(formData.get("eventMemberId")),
      p_status: clean(formData.get("status")) as Enums<"membership_status">,
    });
    if (error) {
      throw error;
    }
    revalidatePath(`/events/${eventId}/committee`);
    redirect(`/events/${eventId}/committee?saved=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    redirect(`/events/${eventId}/committee?error=${encodeURIComponent(safeMessage(error))}`);
  }
}

export async function acceptInvitationAction(formData: FormData) {
  const supabase = await rpcClient();
  const rawToken = clean(formData.get("token"));
  const source = clean(formData.get("source"));
  const parsed = parseInvitationInput(rawToken);
  const token = parsed.ok ? parsed.token : rawToken;
  const errorRedirect =
    source === "join"
      ? `/app/join?token=${encodeURIComponent(token)}`
      : `/invitations/${encodeURIComponent(token)}`;

  try {
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const { data, error } = await supabase.rpc("accept_invitation", {
      p_raw_token: token,
    });
    if (error) {
      throw error;
    }
    revalidatePath("/app");
    revalidatePath("/events");
    revalidatePath(`/events/${data}`);

    if (source === "join") {
      redirect(`/app?joinedEventId=${encodeURIComponent(data)}`);
    }

    redirect(`/events/${data}?accepted=1`);
  } catch (error) {
    if (isFrameworkRedirect(error)) {
      throw error;
    }
    const message =
      error instanceof Error
        ? friendlyInvitationError(error.message)
        : "The invitation could not be validated.";
    redirect(
      `${errorRedirect}${errorRedirect.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`,
    );
  }
}
