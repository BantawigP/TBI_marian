import { useState } from 'react';
import { FileText, User, Mail, Phone, GraduationCap, Briefcase, Building2, Calendar, Check, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

export function AlumniForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.college) {
      newErrors.college = 'Please select a college';
    }
    if (!formData.program.trim()) {
      newErrors.program = 'Program/Course is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
          setErrors({ email: 'This email address is already registered in our alumni database.' });
          toast.error('Email already registered');
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

      toast.success('Form submitted successfully!');
      setIsSubmitted(true);
      
      // Reset form after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        handleReset();
      }, 5000);
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
    setErrors({});
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Your information has been successfully submitted to the MARIAN TBI Connect alumni database.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-sm text-blue-900">
              <strong>What's Next?</strong>
              <br />
              Our team will review your information and you'll receive a confirmation email at <strong>{formData.email}</strong> within 24-48 hours.
            </p>
          </div>
          <button
            onClick={() => setIsSubmitted(false)}
            className="px-8 py-3 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors font-medium"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1ED] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-br from-[#FF2B5E] to-[#FF6B8E] p-8 md:p-12 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold">MARIAN TBI Connect</h1>
                <p className="text-white/90 text-lg">Alumni Information Form</p>
              </div>
            </div>
            <p className="text-white/90">
              Welcome! Please take a few minutes to fill out this form and help us keep our alumni network up to date. 
              All fields marked with <span className="text-white font-semibold">*</span> are required.
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            <div className="space-y-8">
              {/* Personal Information Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-[#FF2B5E]" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
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
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
                </div>
                <div className="space-y-6">
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
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        id="contactNumber"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        placeholder="+63 912 345 6789"
                        disabled={isSubmitting}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Education Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Education</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-2">
                      College <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="college"
                      name="college"
                      value={formData.college}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${
                        errors.college ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] bg-white transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Select College</option>
                      <option value="Business">College of Business</option>
                      <option value="Engineering">College of Engineering</option>
                      <option value="IT">College of Information Technology</option>
                      <option value="Arts">College of Arts and Sciences</option>
                      <option value="Education">College of Education</option>
                      <option value="Health Sciences">College of Health Sciences</option>
                      <option value="Nursing">College of Nursing</option>
                      <option value="Law">College of Law</option>
                    </select>
                    {errors.college && (
                      <p className="text-red-500 text-sm mt-1">{errors.college}</p>
                    )}
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
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${
                        errors.program ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errors.program && (
                      <p className="text-red-500 text-sm mt-1">{errors.program}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="dateGraduated" className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        id="dateGraduated"
                        name="dateGraduated"
                        value={formData.dateGraduated}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Professional Information</h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">This section is optional but helps us understand your career path.</p>
                <div className="space-y-6">
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
                      placeholder="e.g., Software Engineer, Marketing Manager, Teacher"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company/Organization
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="e.g., ABC Corporation, XYZ Inc."
                        disabled={isSubmitting}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Check className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Privacy & Data Protection</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Your information will be used exclusively for alumni network purposes and will be kept confidential 
                      in accordance with our data privacy policy and the Data Privacy Act of 2012. We are committed to 
                      protecting your personal information.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-4 bg-[#FF2B5E] text-white rounded-lg hover:bg-[#E6275A] transition-colors font-medium flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Submit Information
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Form Footer */}
          <div className="bg-gray-50 px-8 md:px-12 py-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Having trouble? Contact us at{' '}
                <a href="mailto:support@mariantbi.edu" className="text-[#FF2B5E] hover:underline font-medium">
                  support@mariantbi.edu
                </a>
              </p>
              <p className="text-xs text-gray-500">
                © 2026 MARIAN TBI Connect. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
