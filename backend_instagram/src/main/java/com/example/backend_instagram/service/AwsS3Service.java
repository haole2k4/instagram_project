package com.example.backend_instagram.service;

import com.example.backend_instagram.utils.error.ApiException;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class AwsS3Service {

    private static final Map<String, String> EXTENSION_TO_MIME = Map.ofEntries(
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("webp", "image/webp"),
            Map.entry("gif", "image/gif"),
            Map.entry("mp4", "video/mp4"),
            Map.entry("webm", "video/webm"),
            Map.entry("mov", "video/quicktime"));

    private static final Set<String> IMAGE_MIMES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif");

    private static final Set<String> VIDEO_MIMES = Set.of(
            "video/mp4",
            "video/webm",
            "video/quicktime");

    private final S3Client s3Client;
    private final String bucketName;
    private final String region;
    private final String publicEndpoint;

    @Autowired
    public AwsS3Service(
            @Value("${aws.access-key-id}") String accessKey,
            @Value("${aws.secret-access-key}") String secretKey,
            @Value("${aws.region}") String region,
            @Value("${aws.s3.bucket}") String bucketName,
            @Value("${aws.s3.endpoint:}") String endpoint,
            @Value("${aws.s3.public-endpoint:}") String publicEndpoint) {
        this.region = region;
        this.bucketName = bucketName;
        this.publicEndpoint = publicEndpoint == null ? "" : publicEndpoint;

        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)));
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint)).forcePathStyle(true);
        }
        this.s3Client = builder.build();
    }

    AwsS3Service(S3Client s3Client, String bucketName, String region, String publicEndpoint) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.region = region;
        this.publicEndpoint = publicEndpoint == null ? "" : publicEndpoint;
    }

    public record ValidatedMedia(String mediaType, String extension, String contentType) {}

    public ValidatedMedia validateMediaFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Tệp tải lên không được để trống.");
        }
        String ext = extractExtension(file.getOriginalFilename());
        String expectedMime = ext == null ? null : EXTENSION_TO_MIME.get(ext);
        String rawContentType = normalizeMime(file.getContentType());

        if (expectedMime == null || rawContentType == null || !expectedMime.equals(rawContentType)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_TYPE",
                    "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh (jpg, png, webp, gif) và video (mp4, webm, mov).");
        }

        String mediaType;
        if (IMAGE_MIMES.contains(expectedMime)) {
            mediaType = "IMAGE";
        } else if (VIDEO_MIMES.contains(expectedMime)) {
            mediaType = "VIDEO";
        } else {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_TYPE",
                    "Định dạng tệp không được hỗ trợ.");
        }
        return new ValidatedMedia(mediaType, "." + ext, expectedMime);
    }

    public String uploadFile(String fileName, byte[] fileData) {
        if (fileName == null || fileName.isBlank() || fileData == null || fileData.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Tên tệp và nội dung không được rỗng.");
        }
        String ext = extractExtension(fileName);
        if (ext == null || !EXTENSION_TO_MIME.containsKey(ext)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_TYPE",
                    "Phần mở rộng tệp không được phép tải lên.");
        }

        try {
            String contentType = determineContentType(fileName);

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(fileData));

            return publicEndpoint.isBlank()
                    ? "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + fileName
                    : publicEndpoint.replaceAll("/$", "") + "/" + bucketName + "/" + fileName;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "S3_UPLOAD_ERROR",
                    "Lỗi upload file lên S3: " + e.getMessage());
        }
    }

    String determineContentType(String fileName) {
        String ext = extractExtension(fileName);
        if (ext == null) {
            return "application/octet-stream";
        }
        return switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "avif" -> "image/avif";
            case "mp4" -> "video/mp4";
            case "mov" -> "video/quicktime";
            case "avi" -> "video/x-msvideo";
            case "webm" -> "video/webm";
            default -> "application/octet-stream";
        };
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_URL", "URL tệp không hợp lệ.");
        }
        String key = extractObjectKey(fileUrl);
        if (key == null || key.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_URL", "Không thể xác định khóa S3 từ URL.");
        }
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            s3Client.deleteObject(deleteObjectRequest);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "S3_DELETE_ERROR",
                    "Lỗi xóa file từ S3: " + e.getMessage());
        }
    }

    @PreDestroy
    public void close() {
        if (s3Client != null) {
            s3Client.close();
        }
    }

    private String extractObjectKey(String fileUrl) {
        String trimmed = fileUrl.trim();
        if (!publicEndpoint.isBlank()) {
            String prefix = publicEndpoint.replaceAll("/$", "") + "/" + bucketName + "/";
            if (trimmed.startsWith(prefix)) {
                return trimmed.substring(prefix.length());
            }
        }
        try {
            URI uri = URI.create(trimmed);
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return null;
            }
            String key = path.startsWith("/") ? path.substring(1) : path;
            String bucketPrefix = bucketName + "/";
            if (key.startsWith(bucketPrefix)) {
                key = key.substring(bucketPrefix.length());
            }
            return key;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String extractExtension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        int lastSlash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
        int dot = fileName.lastIndexOf('.');
        if (dot <= lastSlash || dot == fileName.length() - 1) {
            return null;
        }
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeMime(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        int semicolon = contentType.indexOf(';');
        String base = semicolon >= 0 ? contentType.substring(0, semicolon) : contentType;
        return base.trim().toLowerCase(Locale.ROOT);
    }
}
