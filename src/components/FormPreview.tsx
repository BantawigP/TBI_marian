import { useState } from 'react';
import { FileText, User, Mail, GraduationCap, Briefcase, Calendar, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

export function FormPreview() {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    college: '',
    program: '',
    dateGraduated: '',
    occupation: '',
    company: '',
  });

  const formLink = `${window.location.origin}/alumni-form`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.college || !formData.program.trim()) {
      toast.error('Please fill in all required fields', {
        description: 'First Name, Last Name, Email, College, and Program are required.',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Invalid email address', {
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email already exists in email_address table
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('email_address')
        .select('email_id, email')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        throw emailCheckError;
      }

      let emailId: number | null = null;

      if (existingEmail) {
        // Email already exists, check if it's linked to an alumni
        const { data: existingAlumni, error: alumniCheckError } = await supabase
          .from('alumni')
          .select('alumni_id')
          .eq('email_id', existingEmail.email_id)
          .maybeSingle();

        if (alumniCheckError && alumniCheckError.code !== 'PGRST116') {
          throw alumniCheckError;
        }

        if (existingAlumni) {
          toast.error('Email already registered', {
            description: 'This email address is already in our alumni database.',
          });
          setIsSubmitting(false);
          return;
        }

        emailId = existingEmail.email_id;
      } else {
        // Create new email address entry
        const { data: newEmail, error: insertEmailError } = await supabase
          .from('email_address')
          .insert({ email: formData.email.toLowerCase().trim(), status: false })
          .select('email_id')
          .single();

        if (insertEmailError) throw insertEmailError;
        emailId = newEmail.email_id;
      }

      // Get or create college
      let collegeId: number | null = null;
      if (formData.college) {
        const { data: collegeData, error: collegeError } = await supabase
          .from('colleges')
          .select('college_id')
          .eq('college_name', formData.college)
          .maybeSingle();

        if (collegeError && collegeError.code !== 'PGRST116') {
          throw collegeError;
        }

        if (collegeData) {
          collegeId = collegeData.college_id;
        } else {
          const { data: newCollege, error: insertCollegeError } = await supabase
            .from('colleges')
            .insert({ college_name: formData.college })
            .select('college_id')
            .single();

          if (insertCollegeError) throw insertCollegeError;
          collegeId = newCollege.college_id;
        }
      }

      // Get or create program
      let programId: number | null = null;
      if (formData.program) {
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('program_id')
          .eq('program_name', formData.program)
          .maybeSingle();

        if (programError && programError.code !== 'PGRST116') {
          throw programError;
        }

        if (programData) {
          programId = programData.program_id;
        } else {
          const { data: newProgram, error: insertProgramError } = await supabase
            .from('programs')
            .insert({ program_name: formData.program })
            .select('program_id')
            .single();

          if (insertProgramError) throw insertProgramError;
          programId = newProgram.program_id;
        }
      }

      // Get or create company (if provided)
      let companyId: number | null = null;
      if (formData.company.trim()) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('company_id')
          .eq('company_name', formData.company.trim())
          .maybeSingle();

        if (companyError && companyError.code !== 'PGRST116') {
          throw companyError;
        }

        if (companyData) {
          companyId = companyData.company_id;
        } else {
          const { data: newCompany, error: insertCompanyError } = await supabase
            .from('companies')
            .insert({ company_name: formData.company.trim() })
            .select('company_id')
            .single();

          if (insertCompanyError) throw insertCompanyError;
          companyId = newCompany.company_id;
        }
      }

      // Get or create occupation (if provided)
      let occupationId: number | null = null;
      if (formData.occupation.trim()) {
        const { data: occupationData, error: occupationError } = await supabase
          .from('occupations')
          .select('occupation_id')
          .eq('occupation_title', formData.occupation.trim())
          .maybeSingle();

        if (occupationError && occupationError.code !== 'PGRST116') {
          throw occupationError;
        }

        if (occupationData) {
          occupationId = occupationData.occupation_id;
        } else {
          const { data: newOccupation, error: insertOccupationError } = await supabase
            .from('occupations')
            .insert({ occupation_title: formData.occupation.trim() })
            .select('occupation_id')
            .single();

          if (insertOccupationError) throw insertOccupationError;
          occupationId = newOccupation.occupation_id;
        }
      }

      // Validate required IDs before insert
      if (!emailId) {
        throw new Error('Failed to create email address');
      }
      if (!collegeId) {
        throw new Error('Failed to create or find college');
      }
      if (!programId) {
        throw new Error('Failed to create or find program');
      }

      // Build payload - alumni_id will be auto-generated by database
      const alumniPayload: any = {};
      
      alumniPayload.f_name = formData.firstName.trim();
      alumniPayload.l_name = formData.lastName.trim();
      alumniPayload.email_id = emailId;
      alumniPayload.college_id = collegeId;
      alumniPayload.program_id = programId;
      alumniPayload.is_active = true;
      
      // Optional fields - only add if they have values
      if (formData.contactNumber?.trim()) {
        alumniPayload.contact_number = formData.contactNumber.trim();
      }
      if (formData.dateGraduated) {
        alumniPayload.date_graduated = formData.dateGraduated;
      }
      if (companyId) {
        alumniPayload.company_id = companyId;
      }
      if (occupationId) {
        alumniPayload.occupation_id = occupationId;
      }

      console.log('Inserting alumni with payload:', alumniPayload);

      const { error: insertError } = await supabase
        .from('alumni')
        .insert([alumniPayload]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      toast.success('Form submitted successfully!', {
        description: 'Your information has been added to the alumni database.',
      });

      // Reset form
      handleReset();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error('Submission failed', {
        description: error.message || 'Unable to submit form. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      college: '',
      program: '',
      dateGraduated: '',
      occupation: '',
      company: '',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Alumni Form Preview</h1>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-gray-600">Preview and test the alumni information form</p>
            <p className="text-sm text-green-600 font-medium mt-1">✓ Form is live - submissions will be saved to the alumni database</p>
          </div>
          <button
            onClick={() => window.open('/alumni-form', '_blank')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Live Form
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Preview Mode</h3>
            <p className="text-sm text-gray-600">Switch between desktop and mobile views</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                previewMode === 'desktop'
                  ? 'bg-[#FF2B5E] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                previewMode === 'mobile'
                  ? 'bg-[#FF2B5E] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center min-h-[600px]">
        <div
          className={`bg-white rounded-xl shadow-xl transition-all ${
            previewMode === 'desktop' ? 'w-full max-w-4xl' : 'w-full max-w-md'
          }`}
        >
          {/* Form Header */}
          <div className="bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] p-8 rounded-t-xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">MARIAN TBI Connect</h2>
                <p className="text-white/90">Alumni Information Form</p>
              </div>
            </div>
            <p className="text-white/80 text-sm">
              Please fill out this form to update your information in our alumni database. All fields marked with * are required.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handlePreviewSubmit} className="p-8">
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#FF2B5E]" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Juan"
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Dela Cruz"
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#FF2B5E]" />
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="juan.delacruz@example.com"
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contactNumber"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      placeholder="+63 912 345 6789"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Education Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#FF2B5E]" />
                  Education
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-2">
                      College <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="college"
                      name="college"
                      value={formData.college}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select College</option>
                      <option value="Business">Business</option>
                      <option value="Engineering">Engineering</option>
                      <option value="IT">Information Technology</option>
                      <option value="Arts">Arts and Sciences</option>
                      <option value="Education">Education</option>
                      <option value="Health Sciences">Health Sciences</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-2">
                      Program/Course <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="program"
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      placeholder="e.g., Computer Science, Marketing, Civil Engineering"
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateGraduated" className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Date
                    </label>
                    <input
                      type="date"
                      id="dateGraduated"
                      name="dateGraduated"
                      value={formData.dateGraduated}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#FF2B5E]" />
                  Professional Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Occupation
                    </label>
                    <input
                      type="text"
                      id="occupation"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleInputChange}
                      placeholder="e.g., Software Engineer, Marketing Manager"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="e.g., ABC Corporation"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Privacy Notice:</strong> Your information will be used solely for alumni network purposes
                  and will be kept confidential in accordance with our data privacy policy.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Submit Information
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Form Footer */}
          <div className="bg-gray-50 px-8 py-4 rounded-b-xl border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              Having trouble? Contact us at <span className="text-[#FF2B5E]">support@mariantbi.edu</span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">156</h3>
          <p className="text-sm text-gray-600">Form Submissions</p>
          <p className="text-xs text-green-600 mt-2">+23 this week</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">89%</h3>
          <p className="text-sm text-gray-600">Completion Rate</p>
          <p className="text-xs text-blue-600 mt-2">Above average</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-1">3.2 min</h3>
          <p className="text-sm text-gray-600">Average Time</p>
          <p className="text-xs text-purple-600 mt-2">Per submission</p>
        </div>
      </div>

      {/* Form Link Card */}
      <div className="bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-2">Share Form with Alumni</h2>
            <p className="text-white/90 mb-4">
              Copy the form link below and share it with your alumni network
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center justify-between">
              <code className="text-sm text-white font-mono">
                {formLink}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(formLink);
                  toast.success('Link copied to clipboard!');
                }}
                className="ml-4 bg-white text-[#FF2B5E] px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
