import type { AlumniType, Contact, ContactStatus } from '../../../types';

const defaultStatus: ContactStatus = 'Verified';

const numberOrNull = (value: string | number | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapContactRowToContact = (row: Record<string, any>): Contact => {
  const firstName = row.f_name ?? row.F_name ?? row.first_name ?? row.firstName ?? '';
  const lastName = row.l_name ?? row.L_name ?? row.last_name ?? row.lastName ?? '';

  const collegeId = numberOrNull(row.college_id ?? row.colleges?.college_id ?? null);
  const programId = numberOrNull(row.program_id ?? row.programs?.program_id ?? null);
  const companyId = numberOrNull(row.company_id ?? row.companies?.company_id ?? null);
  const occupationId = numberOrNull(row.occupation_id ?? row.occupations?.occupation_id ?? null);
  const alumniAddressId = numberOrNull(
    row.alumniaddress_id ?? row.alumni_addresses?.alumniaddress_id ?? null
  );
  const locationId = numberOrNull(
    row.location_id ??
      row.locations?.location_id ??
      row.alumni_addresses?.location_id ??
      row.alumni_addresses?.locations?.location_id ??
      null
  );

  return {
    id: (row.alumni_id ?? row.id ?? row.uuid)?.toString() || Date.now().toString(),
    alumniId: numberOrNull(row.alumni_id) || undefined,
    firstName,
    lastName,
    name: row.full_name ?? row.name ?? `${firstName} ${lastName}`.trim(),
    college: row.college ?? row.college_name ?? row.colleges?.college_name ?? '',
    program: row.program ?? row.program_name ?? row.programs?.program_name ?? '',
    email: row.email_address?.email ?? '',
    status: (
      row.email_address?.status === true ? 'Verified' :
      row.email_address?.status === false ? 'Unverified' :
      row.status === true ? 'Verified' :
      row.status === false ? 'Unverified' :
      defaultStatus
    ) as ContactStatus,
    contactNumber: row.contact_number
      ? row.contact_number.toString()
      : row.contactNumber ?? '',
    dateGraduated: row.date_graduated ?? row.year_graduated ?? '',
    occupation:
      row.occupation ?? row.occupation_title ?? row.occupations?.occupation_title ?? '',
    company: row.company ?? row.company_name ?? row.companies?.company_name ?? '',
    address:
      row.address ??
      row.location ??
      row.locations?.name ??
      row.alumni_addresses?.locations?.name ??
      '',
    collegeId: collegeId ?? undefined,
    programId: programId ?? undefined,
    companyId: companyId ?? undefined,
    occupationId: occupationId ?? undefined,
    locationId: locationId ?? undefined,
    alumniAddressId: alumniAddressId ?? undefined,
    alumniType: (() => {
      const typeName = row.alumni_types?.name ?? null;
      if (typeName === 'Graduate') return 'graduate' as AlumniType;
      if (typeName === 'Marian Graduate') return 'marian_graduate' as AlumniType;
      const typeId = row.alumni_type_id;
      if (typeId === 1) return 'graduate' as AlumniType;
      if (typeId === 2) return 'marian_graduate' as AlumniType;
      return undefined;
    })(),
  };
};
