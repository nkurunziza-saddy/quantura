"use server";

import type { InsertInvitation } from "@/lib/schema/schema-types";
import { Permission } from "@/server/constants/permissions";
import { ErrorCode } from "@/server/constants/errors";
import { revalidatePath } from "next/cache";
import {
  createProtectedAction,
  createPublicAction,
} from "@/server/helpers/action-factory";
import * as invitationRepo from "../repos/invitations-repo";

export const getInvitations = createProtectedAction(
  Permission.INVITATION_VIEW,
  async (user) => {
    const invitations = await invitationRepo.get_all_cached(user.businessId!);
    if (invitations.error) {
      return { data: null, error: invitations.error };
    }
    return { data: invitations.data, error: null };
  }
);

export const getInvitationById = createProtectedAction(
  Permission.INVITATION_VIEW,
  async (user, invitationId: string) => {
    if (!invitationId?.trim()) {
      return { data: null, error: ErrorCode.MISSING_INPUT };
    }
    const invitation = await invitationRepo.get_by_id(
      invitationId,
      user.businessId!
    );
    if (invitation.error) {
      return { data: null, error: invitation.error };
    }
    return { data: invitation.data, error: null };
  }
);

import { resend } from "@/lib/email";
import InvitationEmail from "@/components/emails/invitation-email";
import { render } from "@react-email/render";
import { get_by_id_cached as getBusinessByIdRepo } from "../repos/business-repo";
import { accept_invitation as acceptInvitationRepo } from "../repos/invitations-repo";
import { redirect } from "next/navigation";

export const createInvitation = createProtectedAction(
  Permission.INVITATION_CREATE,
  async (
    user,
    invitationData: Omit<
      InsertInvitation,
      "businessId" | "id" | "code" | "expiresAt" | "isAccepted" | "invitedBy"
    >
  ) => {
    if (!invitationData.email?.trim()) {
      return { data: null, error: ErrorCode.MISSING_INPUT };
    }

    const res = await invitationRepo.create(
      user.businessId!,
      user.id,
      invitationData
    );
    if (res.error) {
      return { data: null, error: res.error };
    }

    const business = await getBusinessByIdRepo(user.businessId!);
    if (business.error || !business.data) {
      return { data: null, error: ErrorCode.FAILED_REQUEST };
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/accept-invitation?code=${res.data.code}`;

    const emailHtml = render(
      InvitationEmail({
        inviteLink,
        invitedByName: user.name,
        businessName: business.data.name,
      })
    );

    try {
      const resolvedEmailHtml = await emailHtml;
      const t = await resend.emails.send({
        from: "Quantura <onboarding@resend.dev>",
        to: invitationData.email,
        subject: `Join ${business.data.name} on Quantura`,
        html: resolvedEmailHtml,
      });
      console.log({ t });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      return { data: null, error: ErrorCode.FAILED_REQUEST };
    }
    revalidatePath("users");
    return { data: res.data, error: null };
  }
);

export const updateInvitation = createProtectedAction(
  Permission.INVITATION_UPDATE,
  async (
    user,
    {
      invitationId,
      updates,
    }: {
      invitationId: string;
      updates: Partial<Omit<InsertInvitation, "id" | "businessId">>;
    }
  ) => {
    if (!invitationId?.trim()) {
      return { data: null, error: ErrorCode.MISSING_INPUT };
    }
    const updatedInvitation = await invitationRepo.update(
      invitationId,
      user.businessId!,
      user.id,
      updates
    );
    if (updatedInvitation.error) {
      return { data: null, error: updatedInvitation.error };
    }
    revalidatePath("users");
    return { data: updatedInvitation.data, error: null };
  }
);

export const deleteInvitation = createProtectedAction(
  Permission.INVITATION_DELETE,
  async (user, invitationId: string) => {
    if (!invitationId?.trim()) {
      return { data: null, error: ErrorCode.MISSING_INPUT };
    }
    const res = await invitationRepo.remove(
      invitationId,
      user.businessId!,
      user.id
    );
    if (res.error) {
      return { data: null, error: res.error };
    }
    revalidatePath("users");
    return { data: { success: true }, error: null };
  }
);

export const createManyInvitations = createProtectedAction(
  Permission.INVITATION_CREATE,
  async (
    user,
    invitationsData: Omit<
      InsertInvitation,
      "businessId" | "id" | "code" | "expiresAt" | "isAccepted" | "invitedBy"
    >[]
  ) => {
    if (invitationsData === null) {
      return { data: null, error: ErrorCode.MISSING_INPUT };
    }
    const invitations: Omit<
      InsertInvitation,
      "id" | "code" | "expiresAt" | "isAccepted" | "invitedBy"
    >[] = invitationsData.map((invitation) => ({
      ...invitation,
      businessId: user.businessId!,
    }));
    const createdInvitations = await invitationRepo.create_many(invitations);
    if (createdInvitations.error) {
      return { data: null, error: createdInvitations.error };
    }

    const business = await getBusinessByIdRepo(user.businessId!);
    if (business.error || !business.data) {
      return { data: null, error: ErrorCode.FAILED_REQUEST };
    }

    for (const invitation of createdInvitations.data) {
      const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/accept-invitation?code=${invitation.code}`;
      const emailHtml = render(
        InvitationEmail({
          inviteLink,
          invitedByName: user.name,
          businessName: business.data.name,
        })
      );

      try {
        const resolvedEmailHtml = await emailHtml;
        await resend.emails.send({
          from: "Quantura <onboarding@resend.dev>",
          to: invitation.email,
          subject: `Join ${business.data.name} on Quantura`,
          html: resolvedEmailHtml,
        });
      } catch (emailError) {
        console.error(
          `Failed to send invitation email to ${invitation.email}:`,
          emailError
        );
      }
    }
    revalidatePath("users");
    return { data: createdInvitations.data, error: null };
  }
);

export const acceptInvitation = createPublicAction(
  async ({ code, action }: { code: string; action: "accept" | "decline" }) => {
    const res = await acceptInvitationRepo(code, action);
    if (!res) {
      redirect("/");
    }
    if (res.error) {
      redirect("/");
    }
    revalidatePath("/", "layout");
    redirect(res.data.redirect || "/");
  }
);

export const setPasswordForInvitation = createPublicAction(
  async ({
    email,
    invitationCode,
    password,
  }: {
    email: string;
    invitationCode: string;
    password: string;
  }) => {
    const res = await invitationRepo.set_password_for_invitation(
      email,
      invitationCode,
      password
    );
    if (!res) {
      redirect("/");
    }
    if (res.error) {
      redirect("/");
    }
    revalidatePath("/", "layout");
    redirect(res.data.redirect || "/");
  }
);
