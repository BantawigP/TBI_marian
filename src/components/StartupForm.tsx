import { useState } from 'react';
import { Rocket, User, Mail, Phone, Briefcase, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

interface FounderEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

const emptyFounder = (): FounderEntry => ({
  id: `f-${Date.now()}-${Math.random()}`,
  name: '',
  email: '',
  phone: '',
  role: '',
});

export function StartupForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    startupName: '',
    startupDescription: '',
  });

  const [founders, setFounders] = useState<FounderEntry[]>([emptyFounder()]);

  // ── handlers ──────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFounderChange = (id: string, field: keyof FounderEntry, value: string) => {
    setFounders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
    if (errors[`founder_${id}_${field}`]) {
      setErrors((prev) => ({ ...prev, [`founder_${id}_${field}`]: '' }));
    }
  };

  const addFounder = () => {
    setFounders((prev) => [...prev, emptyFounder()]);
  };

  const removeFounder = (id: string) => {
    if (founders.length <= 1) return;
    setFounders((prev) => prev.filter((f) => f.id !== id));
  };

  const handleReset = () => {
    setFormData({
      startupName: '',
      startupDescription: '',
    });
    setFounders([emptyFounder()]);
    setPrivacyAccepted(false);
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startupName.trim()) newErrors.startupName = 'Startup name is required.';
    if (!formData.startupDescription.trim()) newErrors.startupDescription = 'Brief description is required.';
    founders.forEach((f) => {
      if (!f.name.trim()) newErrors[`founder_${f.id}_name`] = 'Founder name is required.';
      if (!f.email.trim()) {
        newErrors[`founder_${f.id}_email`] = 'Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
        newErrors[`founder_${f.id}_email`] = 'Please enter a valid email address.';
      }
      if (!f.role.trim()) newErrors[`founder_${f.id}_role`] = 'Role is required.';
    });

    if (!privacyAccepted) {
      newErrors.privacy = 'You must accept the Data Privacy Policy before submitting.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert incubatee
      const incubateePayload: Record<string, unknown> = {
        startup_name: formData.startupName.trim(),
        startup_description: formData.startupDescription.trim(),
        cohort_level: [1],
        status: 'Undergraduate',
        is_active: true,
      };

      const { data: incubateeRow, error: incubateeError } = await supabase
        .from('incubatees')
        .insert(incubateePayload)
        .select('id')
        .single();

      if (incubateeError) throw incubateeError;

      const incubateeId = incubateeRow.id as number;

      // 2. Insert founders
      const founderRows = founders.map((f) => ({
        incubatee_id: incubateeId,
        name: f.name.trim(),
        email: f.email.toLowerCase().trim(),
        phone: f.phone.trim() || null,
        role: f.role.trim(),
      }));

      const { error: foundersError } = await supabase.from('founders').insert(founderRows);
      if (foundersError) throw foundersError;

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting startup form:', error);
      toast.error('Submission failed', {
        description: error.message || 'Unable to submit form. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── success screen ─────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Submission Received!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Thank you for registering your startup with MARIAN TBI Connect. Our team will review your application and get in touch with you soon.
          </p>
          <button
            onClick={() => { setIsSubmitted(false); handleReset(); }}
            className="w-full px-6 py-3 bg-[#FF2B5E] text-white rounded-xl hover:bg-[#E6275A] transition-colors font-semibold"
          >
            Submit Another Startup
          </button>
        </div>
      </div>
    );
  }

  // ── form ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Rocket className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">MARIAN TBI Connect</h1>
                <p className="text-white/90 font-medium">Startup Registration Form</p>
              </div>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              Register your startup with the Technology Business Incubator. Fill in your startup details and the information of all founding members. Fields marked with <span className="text-white font-bold">*</span> are required.
            </p>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="px-8 py-10 space-y-10">

            {/* ── Startup Information ───────────────────── */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-5 h-5 text-[#FF2B5E]" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Startup Information</h2>
              </div>

              <div className="space-y-5">
                {/* Startup name */}
                <div>
                  <label htmlFor="startupName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Startup Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="startupName"
                    name="startupName"
                    value={formData.startupName}
                    onChange={handleInputChange}
                    placeholder="e.g., TechVenture PH"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.startupName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.startupName && <p className="text-red-500 text-sm mt-1">{errors.startupName}</p>}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="startupDescription" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Brief Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="startupDescription"
                    name="startupDescription"
                    value={formData.startupDescription}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe what your startup does..."
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed resize-none ${errors.startupDescription ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.startupDescription && <p className="text-red-500 text-sm mt-1">{errors.startupDescription}</p>}
                </div>




              </div>
            </section>

            {/* ── Founders ─────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Founders</h2>
                    <p className="text-sm text-gray-500">Add all founding members of your startup</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {founders.length} {founders.length === 1 ? 'founder' : 'founders'}
                </span>
              </div>

              <div className="space-y-6">
                {founders.map((founder, index) => (
                  <div
                    key={founder.id}
                    className="border border-gray-200 rounded-xl p-5 bg-gray-50 relative"
                  >
                    {/* Founder header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded-full">
                        Founder {index + 1}
                      </span>
                      {founders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFounder(founder.id)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={founder.name}
                            onChange={(e) => handleFounderChange(founder.id, 'name', e.target.value)}
                            placeholder="Juan Dela Cruz"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${errors[`founder_${founder.id}_name`] ? 'border-red-400' : 'border-gray-300'}`}
                          />
                        </div>
                        {errors[`founder_${founder.id}_name`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`founder_${founder.id}_name`]}</p>
                        )}
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Role / Position <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={founder.role}
                            onChange={(e) => handleFounderChange(founder.id, 'role', e.target.value)}
                            placeholder="CEO, CTO, Co-Founder..."
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${errors[`founder_${founder.id}_role`] ? 'border-red-400' : 'border-gray-300'}`}
                          />
                        </div>
                        {errors[`founder_${founder.id}_role`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`founder_${founder.id}_role`]}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={founder.email}
                            onChange={(e) => handleFounderChange(founder.id, 'email', e.target.value)}
                            placeholder="juan@startup.com"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${errors[`founder_${founder.id}_email`] ? 'border-red-400' : 'border-gray-300'}`}
                          />
                        </div>
                        {errors[`founder_${founder.id}_email`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`founder_${founder.id}_email`]}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={founder.phone}
                            onChange={(e) => handleFounderChange(founder.id, 'phone', e.target.value)}
                            placeholder="+63 912 345 6789"
                            disabled={isSubmitting}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Founder button */}
                <button
                  type="button"
                  onClick={addFounder}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF2B5E] hover:text-[#FF2B5E] hover:bg-pink-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Founder
                </button>
              </div>
            </section>

            {/* ── Data Privacy ──────────────────────────── */}
            <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Privacy &amp; Data Protection</h3>
              <p className="text-sm text-blue-800 leading-relaxed mb-4">
                The information you provide will be used exclusively for Technology Business Incubator program purposes and will be kept confidential in accordance with our data privacy policy and the <strong>Data Privacy Act of 2012 (R.A. 10173)</strong>. We are committed to protecting your personal information.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => {
                    setPrivacyAccepted(e.target.checked);
                    if (errors.privacy) setErrors((prev) => ({ ...prev, privacy: '' }));
                  }}
                  disabled={isSubmitting}
                  className={`mt-0.5 h-4 w-4 rounded border ${errors.privacy ? 'border-red-500' : 'border-blue-300'} text-[#FF2B5E] focus:ring-[#FF2B5E]/30 disabled:cursor-not-allowed flex-shrink-0`}
                />
                <span className="text-sm text-blue-900 leading-relaxed">
                  I have read and agree to the{' '}
                  <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#FF2B5E] hover:underline font-semibold">
                    Data Privacy Policy
                  </a>
                  . I consent to the collection and processing of the personal information provided above. <span className="text-red-500 font-semibold">*</span>
                </span>
              </label>
              {errors.privacy && (
                <p className="text-red-500 text-sm mt-2 font-medium">{errors.privacy}</p>
              )}
            </section>

            {/* ── Actions ───────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-[#FF2B5E] text-white rounded-xl hover:bg-[#E6275A] transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit Registration
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-5 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Having trouble? Contact us at{' '}
                <a href="mailto:support@mariantbi.edu" className="text-[#FF2B5E] hover:underline font-medium">
                  support@mariantbi.edu
                </a>
              </p>
              <p className="text-xs text-gray-500">© 2026 MARIAN TBI Connect. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
