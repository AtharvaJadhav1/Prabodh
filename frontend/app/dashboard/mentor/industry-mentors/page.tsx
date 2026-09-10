"use client";

import { useState, useMemo, useCallback } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import IndustryMentorMetricCards from "../../../../components/mentor/IndustryMentorMetricCards";
import IndustryMentorCard from "../../../../components/mentor/IndustryMentorCard";
import GroupMappingTable from "../../../../components/mentor/GroupMappingTable";
import AddIndustryMentorModal from "../../../../components/mentor/AddIndustryMentorModal";
import {
  allGroups,
  initialIndustryMentors,
  type IndustryMentor,
} from "../../../../data/mentorDashboard";
import { ExternalLinkIcon } from "../../../../components/dashboard/icons";

export default function IndustryMentorsPage() {
  const [mentors, setMentors] = useState<IndustryMentor[]>(initialIndustryMentors);
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of initialIndustryMentors) {
      for (const teamId of m.mappedTeamIds) {
        map[teamId] = m.id;
      }
    }
    return map;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState<IndustryMentor | null>(null);

  const addIndustryMentor = useCallback(
    (mentor: IndustryMentor, initialTeamIds: string[]) => {
      setMentors((prev) => [...prev, mentor]);
      setAssignments((prev) => {
        const next = { ...prev };
        for (const teamId of initialTeamIds) {
          next[teamId] = mentor.id;
        }
        return next;
      });
    },
    [],
  );

  const updateIndustryMentor = useCallback(
    (mentor: IndustryMentor) => {
      setMentors((prev) => prev.map((m) => (m.id === mentor.id ? mentor : m)));
      setAssignments((prev) => {
        const next = { ...prev };
        // Remove old assignments for this mentor
        for (const teamId of Object.keys(next)) {
          if (next[teamId] === mentor.id) delete next[teamId];
        }
        // Add new assignments
        for (const teamId of mentor.mappedTeamIds) {
          next[teamId] = mentor.id;
        }
        return next;
      });
    },
    [],
  );

  const unmapAll = useCallback((mentorId: string) => {
    setMentors((prev) =>
      prev.map((m) => (m.id === mentorId ? { ...m, mappedTeamIds: [] } : m)),
    );
    setAssignments((prev) => {
      const next = { ...prev };
      for (const teamId of Object.keys(next)) {
        if (next[teamId] === mentorId) delete next[teamId];
      }
      return next;
    });
  }, []);

  const removeMentor = useCallback((mentorId: string) => {
    setMentors((prev) => prev.filter((m) => m.id !== mentorId));
    setAssignments((prev) => {
      const next = { ...prev };
      for (const teamId of Object.keys(next)) {
        if (next[teamId] === mentorId) delete next[teamId];
      }
      return next;
    });
  }, []);

  const assignTeam = useCallback((teamId: string, mentorId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (mentorId) {
        next[teamId] = mentorId;
      } else {
        delete next[teamId];
      }
      return next;
    });
    // Also update the mentor's mappedTeamIds
    if (mentorId) {
      setMentors((prev) =>
        prev.map((m) => {
          if (m.id === mentorId && !m.mappedTeamIds.includes(teamId)) {
            return { ...m, mappedTeamIds: [...m.mappedTeamIds, teamId] };
          }
          return m;
        }),
      );
    }
    // Remove from previous mentor if reassigned
    setMentors((prev) =>
      prev.map((m) => {
        if (m.id !== mentorId && m.mappedTeamIds.includes(teamId)) {
          return { ...m, mappedTeamIds: m.mappedTeamIds.filter((id) => id !== teamId) };
        }
        return m;
      }),
    );
  }, []);

  const unmappedGroups = useMemo(() => {
    const assignedIds = new Set(Object.keys(assignments));
    return allGroups.filter((g) => !assignedIds.has(g.teamId));
  }, [assignments]);

  const handleEdit = useCallback((mentor: IndustryMentor) => {
    setEditingMentor(mentor);
    setModalOpen(true);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingMentor(null);
    setModalOpen(true);
  }, []);

  return (
    <MentorShell
      breadcrumb={[
        { label: "SIH 2026 Portal" },
        { label: "Faculty & Mentorship" },
        { label: "Industry Mentors" },
      ]}
      title="Industry Mentors Management"
      subtitle="Invite external technical experts and map them to your assigned hackathon groups (FR-12, FR-13)."
    >
      {/* Top Actions */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <button
          type="button"
          disabled
          title="Coming soon — link a previously registered expert"
          className="inline-flex items-center gap-2 rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-xs font-bold text-brand-deep shadow-xs transition-colors hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ExternalLinkIcon className="h-4 w-4 text-brand-muted" />
          <span>Link Existing Expert</span>
          <span className="rounded border border-brand-sand bg-brand-cream px-1.5 py-0.5 text-[9px] font-semibold text-brand-muted">
            Soon
          </span>
        </button>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Industry Mentor</span>
        </button>
      </div>

      <IndustryMentorMetricCards mentors={mentors} totalTeams={allGroups.length} />

      {/* Registered Mentors */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-brand-deep">Registered Industry Mentors</h2>
            <span className="rounded-full border border-brand-sand bg-brand-cream px-2 py-0.5 text-[10px] font-bold text-brand-muted">
              {mentors.length} Expert{mentors.length !== 1 ? "s" : ""} Linked
            </span>
          </div>
          <span className="text-xs text-brand-muted">
            Industry guides assigned to evaluate Stage 1 prototypes &amp; architecture.
          </span>
        </div>

        {mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
            <p className="text-xs font-medium text-brand-muted">
              No industry mentors registered yet — click &ldquo;+ Add Industry Mentor&rdquo; to send
              your first invite.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {mentors.map((m) => (
              <IndustryMentorCard
                key={m.id}
                mentor={m}
                mappedTeamCount={m.mappedTeamIds.length}
                onEdit={handleEdit}
                onUnmapAll={unmapAll}
                onRemove={removeMentor}
              />
            ))}
          </div>
        )}
      </section>

      {/* Group Mapping Table */}
      <GroupMappingTable
        groups={allGroups}
        mentors={mentors}
        assignments={assignments}
        onAssign={assignTeam}
      />

      {/* Add / Edit Modal */}
      <AddIndustryMentorModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingMentor(null);
        }}
        onSave={(mentor, teamIds) => {
          if (editingMentor) {
            updateIndustryMentor(mentor);
          } else {
            addIndustryMentor(mentor, teamIds);
          }
        }}
        editMentor={editingMentor}
        unmappedGroups={unmappedGroups}
      />
    </MentorShell>
  );
}
