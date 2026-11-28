"""
Volatile In-Memory Conversation Context Store for Calm
Privacy Guarantees:
1. Conversation turns and transient slots exist ONLY in volatile RAM (never written to SQLite/disk/logs).
2. Strictly keyed and isolated by (session_id, conversation_id).
3. Bounded turn history and TTL expiration.
4. Supports immediate erasure when ending a conversation or purging session data.
"""

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.models.companion_schemas import PendingConfirmation

MAX_TURNS_PER_CONVERSATION = 24
CONVERSATION_TTL_SECONDS = 7200  # 2 hours


@dataclass
class ConversationState:
    conversation_id: str
    session_id: str
    turns: list[dict[str, str]] = field(default_factory=list)
    slots: dict[str, Any] = field(default_factory=dict)
    pending_confirmations: dict[str, PendingConfirmation] = field(default_factory=dict)
    turn_count: int = 0
    last_active: float = field(default_factory=time.time)


class CompanionMemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._conversations: dict[str, ConversationState] = {}

    def _prune_expired_locked(self, now: float) -> None:
        expired = [
            cid
            for cid, state in self._conversations.items()
            if now - state.last_active > CONVERSATION_TTL_SECONDS
        ]
        for cid in expired:
            del self._conversations[cid]

    def get_or_create(
        self, session_id: str, conversation_id: str | None = None
    ) -> ConversationState:
        now = time.time()
        with self._lock:
            self._prune_expired_locked(now)
            if conversation_id:
                existing = self._conversations.get(conversation_id)
                if existing is not None:
                    if existing.session_id != session_id:
                        raise PermissionError(
                            "Conversation does not belong to the active session."
                        )
                    existing.last_active = now
                    return existing
                cid = conversation_id
            else:
                cid = f"conv-{uuid.uuid4().hex[:12]}"

            state = ConversationState(
                conversation_id=cid,
                session_id=session_id,
                last_active=now,
            )
            self._conversations[cid] = state
            return state

    def get(self, session_id: str, conversation_id: str) -> ConversationState | None:
        now = time.time()
        with self._lock:
            self._prune_expired_locked(now)
            existing = self._conversations.get(conversation_id)
            if existing is None:
                return None
            if existing.session_id != session_id:
                raise PermissionError(
                    "Conversation does not belong to the active session."
                )
            existing.last_active = now
            return existing

    def append_turn(
        self, session_id: str, conversation_id: str, role: str, text: str
    ) -> None:
        with self._lock:
            state = self._conversations.get(conversation_id)
            if state is None or state.session_id != session_id:
                return
            state.turns.append({"role": role, "text": text})
            if len(state.turns) > MAX_TURNS_PER_CONVERSATION:
                state.turns = state.turns[-MAX_TURNS_PER_CONVERSATION:]
            if role == "user":
                state.turn_count += 1
            state.last_active = time.time()

    def set_pending_confirmation(
        self,
        session_id: str,
        conversation_id: str,
        pending: PendingConfirmation,
    ) -> None:
        with self._lock:
            state = self._conversations.get(conversation_id)
            if state is None or state.session_id != session_id:
                return
            state.pending_confirmations[pending.action_id] = pending
            state.last_active = time.time()

    def pop_pending_confirmation(
        self,
        session_id: str,
        conversation_id: str,
        action_id: str,
    ) -> PendingConfirmation | None:
        with self._lock:
            state = self._conversations.get(conversation_id)
            if state is None:
                return None
            if state.session_id != session_id:
                raise PermissionError(
                    "Conversation does not belong to the active session."
                )
            state.last_active = time.time()
            return state.pending_confirmations.pop(action_id, None)

    def get_latest_pending_confirmation(
        self, session_id: str, conversation_id: str
    ) -> PendingConfirmation | None:
        with self._lock:
            state = self._conversations.get(conversation_id)
            if state is None or state.session_id != session_id:
                return None
            if not state.pending_confirmations:
                return None
            last_key = list(state.pending_confirmations.keys())[-1]
            return state.pending_confirmations[last_key]

    def clear_conversation(self, session_id: str, conversation_id: str) -> bool:
        with self._lock:
            state = self._conversations.get(conversation_id)
            if state is None:
                return False
            if state.session_id != session_id:
                raise PermissionError(
                    "Conversation does not belong to the active session."
                )
            del self._conversations[conversation_id]
            return True

    def clear_session(self, session_id: str) -> int:
        with self._lock:
            to_delete = [
                cid
                for cid, st in self._conversations.items()
                if st.session_id == session_id
            ]
            for cid in to_delete:
                del self._conversations[cid]
            return len(to_delete)

    def reset_all(self) -> None:
        with self._lock:
            self._conversations.clear()


companion_memory = CompanionMemoryStore()
