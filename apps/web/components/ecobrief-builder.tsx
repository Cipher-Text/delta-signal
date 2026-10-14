'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { EcoBriefTopic, EcoBriefTrustFilter } from '@delta-signal/contracts';

export type EcoBriefAreaOption = { value: string; label: string };

const TOPICS: Array<{ id: EcoBriefTopic; title: string; detail: string }> = [
  { id: 'climate', title: 'Climate & rainfall', detail: 'Latest 30-day snapshot by district' },
  { id: 'biodiversity', title: 'Biodiversity', detail: 'Dated GBIF occurrence records' },
  { id: 'emissions', title: 'Emissions', detail: 'National annual greenhouse gas estimates' },
  { id: 'observations', title: 'Community observations', detail: 'Submissions by theme and review level' },
];

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** The brief builder form. The report itself is rendered by the page (server) so it can be printed and cited. */
export default function EcoBriefBuilder({
  areas,
  initialArea,
  initialFrom,
  initialTo,
  initialTopics,
  initialTrust,
  error,
}: {
  areas: EcoBriefAreaOption[];
  initialArea: string;
  initialFrom: string;
  initialTo: string;
  initialTopics: EcoBriefTopic[];
  initialTrust: EcoBriefTrustFilter;
  error: string | null;
}) {
  const [area, setArea] = useState(initialArea);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [preset, setPreset] = useState('custom');
  const [topics, setTopics] = useState<EcoBriefTopic[]>(initialTopics);
  const [trust, setTrust] = useState<EcoBriefTrustFilter>(initialTrust);

  function setPeriod(value: string) {
    setPreset(value);
    if (value === 'custom') return;
    const days = Number(value);
    setFrom(dateOffset(days - 1));
    setTo(new Date().toISOString().slice(0, 10));
  }

  function toggleTopic(topic: EcoBriefTopic) {
    setTopics((current) => (current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!topics.length) event.preventDefault();
  }

  return (
    <>
      <form className="eb-builder panel eb-screen-only" action="/ecobrief" method="get" onSubmit={submit}>
        <div className="eb-builder-heading">
          <div>
            <p className="eb-kicker">Build a brief</p>
            <h2>Choose your scope</h2>
          </div>
          <span>Data availability varies by topic</span>
        </div>
        <div className="eb-controls">
          <label className="eb-field eb-field--area">
            <span>Area</span>
            <select name="area" value={area} onChange={(event) => setArea(event.target.value)}>
              {areas.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="eb-field">
            <span>Time period</span>
            <select value={preset} onChange={(event) => setPeriod(event.target.value)}>
              <option value="custom">Custom dates</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="1825">Last 5 years</option>
            </select>
          </label>
          <label className="eb-field">
            <span>From</span>
            <input type="date" name="from" value={from} onChange={(event) => { setFrom(event.target.value); setPreset('custom'); }} required />
          </label>
          <label className="eb-field">
            <span>To</span>
            <input type="date" name="to" value={to} onChange={(event) => { setTo(event.target.value); setPreset('custom'); }} required />
          </label>
        </div>
        <fieldset className="eb-topics">
          <legend>Include data</legend>
          <div className="eb-topic-grid">
            {TOPICS.map((topic) => (
              <label className="eb-topic" key={topic.id}>
                <input type="checkbox" name="topics" value={topic.id} checked={topics.includes(topic.id)} onChange={() => toggleTopic(topic.id)} />
                <span className="eb-topic-copy"><strong>{topic.title}</strong><small>{topic.detail}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        {topics.includes('observations') && (
          <label className="eb-field eb-trust">
            <span>Observation review level</span>
            <select name="trust" value={trust} onChange={(event) => setTrust(event.target.value as EcoBriefTrustFilter)}>
              <option value="all">All non-flagged records</option>
              <option value="research">Research grade only</option>
            </select>
          </label>
        )}
        {!topics.length && <p className="eb-form-error" role="alert">Select at least one topic to generate a brief.</p>}
        <div className="eb-submit-row">
          <p>Summaries describe the data. They do not infer causes.</p>
          <button className="button" type="submit" disabled={!topics.length}>Generate EcoBrief <span aria-hidden="true">→</span></button>
        </div>
      </form>
      {error && <div className="alert-strip warning eb-error eb-screen-only" role="alert">{error}</div>}
    </>
  );
}
