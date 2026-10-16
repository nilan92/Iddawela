from __future__ import annotations
import datetime as dt
from sqlalchemy import (String, Integer, Text, Boolean, Date, DateTime, ForeignKey, JSON, Float, UniqueConstraint, Index, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def now():
    return dt.datetime.now(dt.timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(40), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="member")          # super_admin | family_admin | member
    status: Mapped[str] = mapped_column(String(20), default="pending")       # pending | approved | rejected | disabled
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"))
    branch_person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"))  # family admins manage this person's descendants
    join_note: Mapped[str | None] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="en")
    token_version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_login_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int | None] = mapped_column(Integer)

class Media(Base):
    __tablename__ = "media"
    id: Mapped[int] = mapped_column(primary_key=True)
    file: Mapped[str] = mapped_column(String(255))          # relative to MEDIA_DIR, large webp
    thumb: Mapped[str | None] = mapped_column(String(255))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    caption_en: Mapped[str | None] = mapped_column(Text)
    caption_si: Mapped[str | None] = mapped_column(Text)
    album_id: Mapped[int | None] = mapped_column(ForeignKey("albums.id", ondelete="SET NULL"), index=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"), index=True)
    visibility: Mapped[str] = mapped_column(String(12), default="members")   # public | members
    uploaded_by: Mapped[int | None] = mapped_column(Integer)
    legacy_id: Mapped[int | None] = mapped_column(Integer, index=True)
    taken_year: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)

class Person(Base):
    __tablename__ = "people"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_si: Mapped[str | None] = mapped_column(String(255))
    known_as: Mapped[str | None] = mapped_column(String(120))
    gender: Mapped[str | None] = mapped_column(String(1))   # M | F
    birth_date: Mapped[dt.date | None] = mapped_column(Date)
    birth_year: Mapped[int | None] = mapped_column(Integer)
    death_date: Mapped[dt.date | None] = mapped_column(Date)
    death_year: Mapped[int | None] = mapped_column(Integer)
    is_living: Mapped[bool | None] = mapped_column(Boolean)       # None = unknown (treated as living for privacy)
    birthplace: Mapped[str | None] = mapped_column(String(255))
    hometown: Mapped[str | None] = mapped_column(String(255))
    residence: Mapped[str | None] = mapped_column(String(255))    # members only
    profession: Mapped[str | None] = mapped_column(String(255))
    skills: Mapped[str | None] = mapped_column(Text)
    bio_en: Mapped[str | None] = mapped_column(Text)
    bio_si: Mapped[str | None] = mapped_column(Text)
    bio_si_machine: Mapped[bool] = mapped_column(Boolean, default=False)   # True until a human reviews the Sinhala
    name_si_machine: Mapped[bool] = mapped_column(Boolean, default=False)
    photo_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL", use_alter=True, name="fk_people_photo_id"))
    generation: Mapped[int | None] = mapped_column(Integer, index=True)
    branch_no: Mapped[int | None] = mapped_column(Integer, index=True)    # which of the 13 Iddawelas (1..13)
    sibling_order: Mapped[int | None] = mapped_column(Integer)
    is_descendant: Mapped[bool] = mapped_column(Boolean, default=True)    # False = married in
    privacy: Mapped[str] = mapped_column(String(12), default="members")   # public | members | private
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(60))
    address: Mapped[str | None] = mapped_column(Text)
    links: Mapped[dict | None] = mapped_column(JSON)
    legacy_pages: Mapped[list | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(12), default="approved")   # approved | pending
    created_by: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class ParentChild(Base):
    __tablename__ = "parent_child"
    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12), default="birth")   # birth | adopted | step
    __table_args__ = (UniqueConstraint("parent_id", "child_id"),)

class Marriage(Base):
    __tablename__ = "marriages"
    id: Mapped[int] = mapped_column(primary_key=True)
    a_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    b_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    married_on: Mapped[dt.date | None] = mapped_column(Date)
    married_year: Mapped[int | None] = mapped_column(Integer)
    place: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(12), default="married")   # married | divorced | widowed
    notes: Mapped[str | None] = mapped_column(Text)
    album_id: Mapped[int | None] = mapped_column(ForeignKey("albums.id", ondelete="SET NULL"))

class Education(Base):
    __tablename__ = "education"
    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    institution: Mapped[str] = mapped_column(String(255))
    qualification: Mapped[str | None] = mapped_column(String(255))
    field: Mapped[str | None] = mapped_column(String(255))
    level: Mapped[str | None] = mapped_column(String(40))  # school | diploma | bachelors | masters | doctorate | professional
    year_from: Mapped[int | None] = mapped_column(Integer)
    year_to: Mapped[int | None] = mapped_column(Integer)
    honours: Mapped[str | None] = mapped_column(String(255))

class Career(Base):
    __tablename__ = "careers"
    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    organization: Mapped[str | None] = mapped_column(String(255))
    industry: Mapped[str | None] = mapped_column(String(120))
    location: Mapped[str | None] = mapped_column(String(255))
    year_from: Mapped[int | None] = mapped_column(Integer)
    year_to: Mapped[int | None] = mapped_column(Integer)
    current: Mapped[bool] = mapped_column(Boolean, default=False)
    open_to_mentor: Mapped[bool] = mapped_column(Boolean, default=False)

class Album(Base):
    __tablename__ = "albums"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(20), default="general")  # heritage | reunion | wedding | general | cause
    year: Mapped[int | None] = mapped_column(Integer)
    description_en: Mapped[str | None] = mapped_column(Text)
    description_si: Mapped[str | None] = mapped_column(Text)
    cover_id: Mapped[int | None] = mapped_column(Integer)
    visibility: Mapped[str] = mapped_column(String(12), default="public")
    legacy_page: Mapped[int | None] = mapped_column(Integer)

class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="reunion")   # reunion | agm | wedding | memorial | csr | other
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    edition: Mapped[int | None] = mapped_column(Integer)
    starts_on: Mapped[dt.date | None] = mapped_column(Date)
    start_time: Mapped[str | None] = mapped_column(String(20))
    venue: Mapped[str | None] = mapped_column(String(255))
    venue_si: Mapped[str | None] = mapped_column(String(255))
    map_url: Mapped[str | None] = mapped_column(String(500))
    sponsor: Mapped[str | None] = mapped_column(String(255))
    attendance: Mapped[str | None] = mapped_column(String(80))
    body_en: Mapped[str | None] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    body_si_machine: Mapped[bool] = mapped_column(Boolean, default=False)
    album_id: Mapped[int | None] = mapped_column(ForeignKey("albums.id", ondelete="SET NULL"))
    cover_id: Mapped[int | None] = mapped_column(Integer)
    rsvp_open: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(12), default="published")

class Rsvp(Base):
    __tablename__ = "rsvps"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    adults: Mapped[int] = mapped_column(Integer, default=1)
    children: Mapped[int] = mapped_column(Integer, default=0)
    response: Mapped[str] = mapped_column(String(10), default="yes")  # yes | maybe | no
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("event_id", "user_id"),)

class Obituary(Base):
    __tablename__ = "obituaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="SET NULL"), index=True)
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    body_en: Mapped[str | None] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    funeral_details: Mapped[str | None] = mapped_column(Text)
    published_on: Mapped[dt.date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default="published")
    created_by: Mapped[int | None] = mapped_column(Integer)

class Condolence(Base):
    __tablename__ = "condolences"
    id: Mapped[int] = mapped_column(primary_key=True)
    obituary_id: Mapped[int] = mapped_column(ForeignKey("obituaries.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    lit_lamp: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(12), default="approved")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)

class Cause(Base):
    __tablename__ = "causes"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    summary_en: Mapped[str | None] = mapped_column(Text)
    summary_si: Mapped[str | None] = mapped_column(Text)
    body_en: Mapped[str | None] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), default="education")  # education | careers | welfare | heritage | community | environment
    status: Mapped[str] = mapped_column(String(12), default="active")       # active | completed | planned | draft
    goal_amount: Mapped[float | None] = mapped_column(Float)
    raised_amount: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(5), default="LKR")
    impact_number: Mapped[str | None] = mapped_column(String(40))
    impact_label_en: Mapped[str | None] = mapped_column(String(120))
    impact_label_si: Mapped[str | None] = mapped_column(String(120))
    how_to_help_en: Mapped[str | None] = mapped_column(Text)
    how_to_help_si: Mapped[str | None] = mapped_column(Text)
    cover_id: Mapped[int | None] = mapped_column(Integer)
    sort: Mapped[int] = mapped_column(Integer, default=0)

class CauseUpdate(Base):
    __tablename__ = "cause_updates"
    id: Mapped[int] = mapped_column(primary_key=True)
    cause_id: Mapped[int] = mapped_column(ForeignKey("causes.id", ondelete="CASCADE"), index=True)
    body_en: Mapped[str] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)

class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    kind: Mapped[str] = mapped_column(String(20), default="news")   # news | announcement | achievement | story
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    body_en: Mapped[str | None] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    body_si_machine: Mapped[bool] = mapped_column(Boolean, default=False)
    cover_id: Mapped[int | None] = mapped_column(Integer)
    published_on: Mapped[dt.date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default="published")
    visibility: Mapped[str] = mapped_column(String(12), default="public")
    author_id: Mapped[int | None] = mapped_column(Integer)

class Opportunity(Base):
    __tablename__ = "opportunities"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), default="job")   # job | internship | mentorship | scholarship | help
    title: Mapped[str] = mapped_column(String(255))
    organization: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    contact: Mapped[str | None] = mapped_column(String(255))
    link: Mapped[str | None] = mapped_column(String(500))
    expires_on: Mapped[dt.date | None] = mapped_column(Date)
    posted_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(12), default="pending")   # pending | open | closed | rejected
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)

class Submission(Base):
    """Every change a regular member proposes waits here until an admin approves it."""
    __tablename__ = "submissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))     # person.create | person.update | education.add | career.add | marriage.add | obituary.create | photo.add
    target_id: Mapped[int | None] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(12), default="pending", index=True)
    reviewer_id: Mapped[int | None] = mapped_column(Integer)
    review_note: Mapped[str | None] = mapped_column(Text)
    result_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

class Audit(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str | None] = mapped_column(String(120))
    detail: Mapped[dict | None] = mapped_column(JSON)
    at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)

class Page(Base):
    """Editable long-form pages (heritage story, webmaster history, Weerakoon lineage...)."""
    __tablename__ = "pages"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_en: Mapped[str] = mapped_column(String(255))
    title_si: Mapped[str | None] = mapped_column(String(255))
    body_en: Mapped[str | None] = mapped_column(Text)
    body_si: Mapped[str | None] = mapped_column(Text)
    body_si_machine: Mapped[bool] = mapped_column(Boolean, default=False)
    section: Mapped[str] = mapped_column(String(40), default="heritage")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    legacy_page: Mapped[int | None] = mapped_column(Integer)
    cover_id: Mapped[int | None] = mapped_column(Integer)

class Suggestion(Base):
    """Facts found by research (web, news, LinkedIn...) waiting for a human to accept. Never auto-published."""
    __tablename__ = "suggestions"
    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    person_hint: Mapped[str | None] = mapped_column(String(255))
    field: Mapped[str] = mapped_column(String(60))           # profession | education | career | bio_note | hometown | photo | link | ...
    value: Mapped[dict | None] = mapped_column(JSON)
    summary: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    source_title: Mapped[str | None] = mapped_column(String(500))
    confidence: Mapped[str | None] = mapped_column(String(12))   # high | medium | low
    batch: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(12), default="pending", index=True)
    reviewer_id: Mapped[int | None] = mapped_column(Integer)
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=now)
