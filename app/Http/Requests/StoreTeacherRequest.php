<?php

namespace App\Http\Requests;

use App\Support\CameroonPhoneNumber;
use App\Support\PersonName;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreTeacherRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|min:3|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'telephone' => ['required', 'string', 'size:9', 'regex:/^6\d{8}$/'],
            'teaches' => 'required|array|min:1',
            'teaches.*.room_id' => 'required|string|max:50',
            'teaches.*.subject' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un compte EduCore. Utilisez une autre adresse ou modifiez le compte existant.',
        ];
    }

    /**
     * Sanitize and prepare input for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => PersonName::title((string) $this->name),
            'email' => trim(strtolower($this->email)),
            'telephone' => CameroonPhoneNumber::localDigits($this->telephone),
        ]);
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => 'Les informations saisies sont invalides.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
