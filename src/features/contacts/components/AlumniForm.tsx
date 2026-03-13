import { useEffect, useState } from 'react';
import { FileText, User, Phone, GraduationCap, Briefcase, Building2, Calendar, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Emailconfirmation } from './Emailconfirmation';
import { sendVerificationEmail } from './email/sendVerificationEmail';

export function AlumniForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [collegeOptions, setCollegeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [alumniTypeOptions, setAlumniTypeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    college: '',
    program: '',
    dateGraduated: '',
    alumniTypeId: null as number | null,
    occupation: '',
    company: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const FALLBACK_ALUMNI_TYPES = [
      { id: 1, name: 'Graduate' },
      { id: 2, name: 'MARIAN Graduate' },
    ];

    const loadColleges = async () => {
      setIsLoadingColleges(true);

      try {
        // Load colleges (required)
        const collegesRes = await supabase
          .from('colleges')
          .select('college_id, college_name')
          .order('college_name', { ascending: true });

        if (collegesRes.error) throw collegesRes.error;

        if (isMounted) {
          const mapped = (collegesRes.data || []).map((college) => ({
            id: college.college_id,
            name: college.college_name,
          }));
          setCollegeOptions(mapped);
        }
      } catch (error: any) {
        console.error('Error loading colleges:', error);
        toast.error('Unable to load colleges', {
          description: error.message || 'Please refresh and try again.',
        });
      } finally {
        if (isMounted) setIsLoadingColleges(false);
      }

      // Load alumni_types separately with graceful fallback in case the
      // table migration has not been applied to the database yet.
      try {
        const alumniTypesRes = await supabase
          .from('alumni_types')
          .select('id, name')
          .order('id', { ascending: true });

        const types =
          alumniTypesRes.error || !alumniTypesRes.data?.length
            ? FALLBACK_ALUMNI_TYPES
            : alumniTypesRes.data.map((t) => ({
                id: t.id,
                name: t.name?.toLowerCase().includes('marian') ? 'MARIAN Graduate' : 'Graduate',
              }));

        if (isMounted) {
          setAlumniTypeOptions(types);
          const marianGrad = types.find((t) => t.name === 'MARIAN Graduate');
          if (marianGrad) {
            setFormData((prev) => ({ ...prev, alumniTypeId: marianGrad.id }));
          }
        }
      } catch {
        // Table likely doesn't exist yet — use hardcoded fallback silently
        if (isMounted) {
          setAlumniTypeOptions(FALLBACK_ALUMNI_TYPES);
          setFormData((prev) => ({ ...prev, alumniTypeId: FALLBACK_ALUMNI_TYPES[1].id }));
        }
      }
    };

    loadColleges();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' || name === 'alumniTypeId' ? (value ? Number(value) : null) : value,
    }));

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
    if (!privacyAccepted) {
      newErrors.privacy = 'To proceed, please read and accept the Data Privacy Policy.';
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

      // Get selected college id from loaded options
      let collegeId: number | null = null;
      if (formData.college) {
        const matchedCollege = collegeOptions.find(
          (college) => college.name === formData.college,
        );
        collegeId = matchedCollege?.id ?? null;
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
      if (formData.alumniTypeId) {
        alumniPayload.alumni_type_id = formData.alumniTypeId;
      }

      console.log('Inserting alumni with payload:', alumniPayload);

      const { error: insertError } = await supabase
        .from('alumni')
        .insert([alumniPayload]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      const normalizedEmail = formData.email.toLowerCase().trim();

      try {
        await sendVerificationEmail({
          to: normalizedEmail,
          firstName: formData.firstName.trim(),
          brandName: 'MARIAN TBI Connect',
        });
      } catch (emailError: any) {
        console.error('Error sending verification email:', emailError);
        toast.error('Verification email failed', {
          description: emailError.message || 'Please contact support if you did not receive an email.',
        });
      }

      toast.success('Form submitted successfully!');
      setIsSubmitted(true);
      
      // Reset form after 10 seconds bwahahaha
      setTimeout(() => {
        setIsSubmitted(false);
        handleReset();
      }, 10000);
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
      alumniTypeId: alumniTypeOptions.find((t) => t.name === 'MARIAN Graduate')?.id ?? null,
      occupation: '',
      company: '',
    });
    setErrors({});
    setPrivacyAccepted(false);
  };

  if (isSubmitted) {
    return (
      <Emailconfirmation
        email={formData.email}
        onSubmitAnother={() => setIsSubmitted(false)}
      />
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
                      disabled={isSubmitting || isLoadingColleges}
                      className={`w-full px-4 py-3 border ${
                        errors.college ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF2B5E]/20 focus:border-[#FF2B5E] bg-white transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Select College</option>
                      {isLoadingColleges ? (
                        <option value="" disabled>
                          Loading colleges...
                        </option>
                      ) : (
                        collegeOptions.map((college) => (
                          <option key={college.id} value={college.name}>
                            {college.name}
                          </option>
                        ))
                      )}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alumni Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      {alumniTypeOptions.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="alumniTypeId"
                            value={opt.id}
                            checked={formData.alumniTypeId === opt.id}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="w-4 h-4 text-[#FF2B5E] focus:ring-[#FF2B5E]"
                          />
                          <span className="text-sm text-gray-700">{opt.name}</span>
                        </label>
                      ))}
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
                <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Privacy & Data Protection</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Your information will be used exclusively for alumni network purposes and will be kept confidential 
                      in accordance with our data privacy policy and the Data Privacy Act of 2012. We are committed to 
                      protecting your personal information.
                    </p>
                    <div className="mt-4">
                      <label className="flex items-start gap-3 text-sm text-blue-900">
                        <input
                          type="checkbox"
                          name="privacyAccepted"
                          checked={privacyAccepted}
                          onChange={(e) => {
                            setPrivacyAccepted(e.target.checked);
                            if (errors.privacy) {
                              setErrors((prev) => ({ ...prev, privacy: '' }));
                            }
                          }}
                          disabled={isSubmitting}
                          className={`mt-0.5 h-4 w-4 rounded border ${
                            errors.privacy ? 'border-red-500' : 'border-blue-300'
                          } text-[#FF2B5E] focus:ring-[#FF2B5E]/30 disabled:cursor-not-allowed`}
                        />
                        <span>
                          I have read and agree to the{' '}
                          <a
                            href="/privacy-policy"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#FF2B5E] hover:underline font-medium"
                          >
                            Data Privacy Policy
                          </a>
                          .
                        </span>
                      </label>
                      {errors.privacy && (
                        <p className="text-red-500 text-sm mt-2">{errors.privacy}</p>
                      )}
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
